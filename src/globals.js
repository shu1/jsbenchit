import StorageManager from './StorageManager.js';
import {isDevelopment} from './flags.js';

export const storageManager = new StorageManager('jsbenchit');
export const clientId = isDevelopment
    ? 'ac89a502d22aab51cc81'
    : '60cb8be0ee81d9bf51a5';

