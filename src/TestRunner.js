import * as model from './model.js';
import {isDevelopment} from './flags.js';
import {createURL} from './url.js';
import * as winMsgMgr from './window-message-manager.js';

export default class TestRunner extends EventTarget {
  abort() {
    if (this._abortImpl) {
      this._abortImpl();
    }
  }
  run(data) {
    return new Promise(async(resolve, reject) => {
      model.clearAllTestResults();

      const runTests = (test) => {
        return new Promise((resolve, reject) => {
          const iframe = document.createElement('iframe');

          const base = isDevelopment
              ? 'http://localhost:8080'
              : window.location.origin;
          const html = `
          <${'script'} type="module" src="${base}/error-reporter.js"></${'script'}>
          <${'script'} src="${base}/3rdparty/lodash.js"></${'script'}>
          <${'script'} src="${base}/3rdparty/platform.js"></${'script'}>
          <${'script'} src="${base}/3rdparty/benchmark.js"></${'script'}>
          <${'script'}>
          const model = ${JSON.stringify({
            ...data,
            settings: {
              ...(data.settings && data.settings),
              test,
            },
          })};
          </${'script'}>
          <${'script'}>
          ${data.initialization}
          </${'script'}>
          <body>
          </body>
          <${'script'} type="module" src="${base}/runner.js"></${'script'}>
          `;
          const runnerData = {
            name: data.title,
            files: [
              {
                name: 'html',
                content: html,
              },
              {
                name: 'css',
                content: '',
              },
              {
                name: 'javascript',
                content: '',
              },
            ],
          };

          let cleanup = (result) => {
            cleanup = () => {}; // only cleanup once
            winMsgMgr.remove('uncaughtError', handleUncaughtError);
            winMsgMgr.remove('abort', handleAbort);
            winMsgMgr.remove('error', handleError);
            winMsgMgr.remove('cycle', handleCycle);
            winMsgMgr.remove('complete', handleComplete);
            winMsgMgr.remove('gimmeDaCodez', handleGimmeDaCodez);
            iframe.remove();
            resolve(result);
          };

          const abort = () => {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({type: 'abort'}, '*');
            }
            cleanup({success: true, data: {message: 'aborted'}});
          };
          this._abortImpl = abort;

          const updateTestResults = (data) => {
            const ndx = parseInt(data.name);
            const newData = {...data};
            delete newData.id;
            delete newData.name;
            model.setTestResult(ndx, newData, window.navigator.userAgent);
            const event = new Event('progress');
            event.data = {
              testNdx: ndx
            };
            this.dispatchEvent(event);
          };

          // error caught by window.addEventListener('error')
          const handleUncaughtError = (data) => {
            abort();
            resolve({success: false, data});
          };
          // benchmark onAbort
          const handleAbort = (data) => {
            cleanup({success: true, data: {message: 'aborted because of error'}});
          };
          // benchmark onError
          const handleError = (data) => {
            updateTestResults(data);
          };
          // benchmark onCycle
          const handleCycle = (data) => {
            if (!test) {
              updateTestResults(data)
            }
          };
          // benchmark onComplete
          const handleComplete = (data) => {
            cleanup({success: true, data});
          };
          const handleGimmeDaCodez = () => {
            iframe.contentWindow.postMessage({
              type: 'run',
              data: runnerData,
            }, "*");
          };

          winMsgMgr.on('uncaughtError', handleUncaughtError);
          winMsgMgr.on('abort', handleAbort);
          winMsgMgr.on('error', handleError);
          winMsgMgr.on('cycle', handleCycle);
          winMsgMgr.on('complete', handleComplete);
          winMsgMgr.on('gimmeDaCodez', handleGimmeDaCodez);

          iframe.src = isDevelopment
              ? createURL('http://localhost:8081/runner-03.html', {...(test && {test}), url: 'http://localhost:8080/jsbenchit-runner.js'})
              : createURL('https://jsbenchitrunner.devcomments.org/runner-03.html', {...(test && {test}), url: 'https://jsbenchit.org/jsbenchit-runner.js'});
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
        });
      }

      // first run all tests the once each
      // so if there is an error in the last test
      // we don't have to wait for all the other
      // tests to run to get a notified.
      try {
        await runTests(true);
      } catch (e) {
        resolve({success: false, e});
        return;
      }

      try {
        const result = await runTests();
        resolve(result);
      } catch(e) {
        reject(e);
      }
    });
  }
};