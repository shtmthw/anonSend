import mongoose from 'mongoose';

type ConnectionObj = {
    isCon: number;
};

const connection: ConnectionObj = { isCon: 0 };

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'main';

if (!MONGODB_URI) {
    // Fail loudly on first use instead of crashing at import time,
    // so a missing variable is easy to diagnose.
    console.warn('[DBconnect] MONGODB_URI is not set. Database calls will fail.');
}

async function DBconnect(): Promise<void> {
    if (connection.isCon) {
        return; // Prevents unnecessary reconnections
    }

    if (!MONGODB_URI) {
        throw new Error(
            'MONGODB_URI is not set. Add it to your .env file (see .env.example).'
        );
    }

    try {
        const DB = await mongoose.connect(MONGODB_URI, {
            dbName: MONGODB_DB,
            serverSelectionTimeoutMS: 8000,
        });

        connection.isCon = DB.connections[0].readyState; // Set connection state
        console.log('[DBconnect] Connected successfully');
    } catch (e) {
        console.error('[DBconnect] Error connecting to database:', e);
        // Let the caller decide what to do (500 response, retry, ...).
        // Calling process.exit here would take the whole container down
        // on a transient database hiccup.
        throw e;
    }
}

export default DBconnect;
