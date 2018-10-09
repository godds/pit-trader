import React, { Component } from 'react';
import { BUY, SELL } from './tensorflow/classifier';
import HandsPalmForward from './hands/HandsPalmFacing';
import HandsPalmBackward from './hands/HandsPalmAway';
import { sleep } from './util';
import Layout from './Layout';

const CLASSIFY_SKIP_COUNT = 20;
const CAPTURE_SKIP_COUNT = 1;
const CAPTURE_COUNT = 200;
const WAITING_FOR_FRAME = 'waiting-for-frame';
const WAITING_FOR_MODEL = 'waiting-for-model';
const PENDING_CAPTURE_BUY = 'pending-capture-buy'
const CAPTURING_BUY = 'capturing-buy'
const PENDING_CAPTURE_SELL = 'pending-capture-sell'
const CAPTURING_SELL = 'capturing-sell'
const TRAINING = 'training';
const CLASSIFYING = 'classifying';

const labelFor = ({ mode, captureCount, trainingProgress }) => {
  switch (mode) {
    case WAITING_FOR_FRAME:
    case WAITING_FOR_MODEL:
      return 'Loading';
    case PENDING_CAPTURE_BUY:
      return 'Buy - Get Ready';
    case CAPTURING_BUY:
      return `Buy - Capturing... (${captureCount}/${CAPTURE_COUNT})`
    case PENDING_CAPTURE_SELL:
      return 'Sell - Get Ready';
    case CAPTURING_SELL:
      return `Sell - Capturing... (${captureCount}/${CAPTURE_COUNT})`
    case TRAINING:
      return `Training... (${trainingProgress})`;
  }
}

class Trainer extends Component {

  constructor() {
    super();
    this.state = {
      mode: WAITING_FOR_FRAME,
      buyProbability: null,
      sellProbability: null,
      captureCount: null,
      skipCount: null,
      trainingProgress: 0,
    };
  }

  handleFrame = async (canvas) => {
    if (this.state.skipCount > 0) {
      this.setState({ skipCount: this.state.skipCount - 1 });
      return;
    }
    switch (this.state.mode) {
      case WAITING_FOR_FRAME: {
        this.setState({
          mode: WAITING_FOR_MODEL
        });
        // kick off a dummy prediction to ensure the model is ready to go
        await this.props.model.classify(canvas);
        this.setState({
          captureCount: 0,
          mode: PENDING_CAPTURE_BUY
        });
        await sleep(5000);
        this.setState({
          mode: CAPTURING_BUY
        });
        return;
      }
      case CAPTURING_BUY: {
        if (this.state.captureCount >= CAPTURE_COUNT) {
          this.setState({
            captureCount: 0,
            mode: PENDING_CAPTURE_SELL
          });
          await sleep(5000);
          this.setState({
            mode: CAPTURING_SELL
          });
          return;
        }
        this.props.model.sample(BUY, canvas);
        this.setState({
          captureCount: this.state.captureCount + 1,
          skipCount: CAPTURE_SKIP_COUNT
        });
        return;
      }
      case CAPTURING_SELL: {
        if (this.state.captureCount >= CAPTURE_COUNT) {
          this.setState({
            captureCount: null,
            mode: TRAINING
          });
          await this.props.model.train(trainingProgress => this.setState({ trainingProgress }));
          this.setState({
            mode: CLASSIFYING
          });
          return;
        }
        this.props.model.sample(SELL, canvas);
        this.setState({
          captureCount: this.state.captureCount + 1,
          skipCount: CAPTURE_SKIP_COUNT
        });
        return;
      }
      case CLASSIFYING: {
        const predictions = await this.props.model.classify(canvas);
        const buyProbability = predictions.find(({ className }) => className === BUY).probability;
        const sellProbability = predictions.find(({ className }) => className === SELL).probability;
        this.setState({
          buyProbability,
          sellProbability,
          skipCount: CLASSIFY_SKIP_COUNT
        });
        return;
      }
      default: {
        // sit pretty :)
      }
    }
  }

  render() {
    const { buyProbability, sellProbability, mode } = this.state;
    const side = buyProbability > sellProbability ? BUY : SELL;
    return (
      <Layout title={
        <div style={{
          textAlign: 'center',
          fontSize: '8vh',
          flex: 1,
          padding: '2vh 0'
        }}>
          {mode !== 'classifying' ? labelFor(this.state) : `${side} (${Math.max(buyProbability, sellProbability).toFixed(2)})`}
        </div>
      }>
        {
          (mode === PENDING_CAPTURE_BUY || mode === CAPTURING_BUY) &&
          <HandsPalmBackward />
        }
        {
          (mode === PENDING_CAPTURE_SELL || mode === CAPTURING_SELL) &&
          <HandsPalmForward />
        }
      </Layout>
    );
  }
}

export default Trainer;