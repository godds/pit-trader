import * as tf from '@tensorflow/tfjs';

const concat = (data, sample) => {
    if (data == null) {
        return sample;
    }
    return data.map((previous, index) => {
        const updated = previous.concat(sample[index], 0);
        previous.dispose();
        return updated;
    });
};

export default (dimensions) => {
    let data = null;
    
    const add = (...sample) => {
        if (sample.length !== dimensions) {
            throw new Error(`Expected ${dimensions} values, received ${sample.length}`);
        }
        data = concat(data, sample).map(tf.keep);
    };

    const get = (dimension) => data[dimension];

    return {
        add,
        get
    };
};

