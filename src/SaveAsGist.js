import React from 'react';
import { classNames } from './css-utils.js';
import * as gists from './gists.js';
import {updateURL} from './url.js';
import {noop, wait} from './utils.js';

export default class SaveAsGist extends React.Component {
  constructor () {
    super();
    this.state = {
      saving: false,
      pat: localStorage.getItem('pat') || '',
    };
  }
  handlePATChange = (e) => {
    const pat = e.target.value;
    this.setState({pat});
    localStorage.setItem('pat', pat);
  }
  handleSubmit = (e) => {
    e.preventDefault();
    this.saveFn();
  }
  // this nonsense about markToSaveAsNewGist and markToUpdateNewGist
  // is because in order to get the browser to save the token as a password
  // we need to use a form. The reason to save it is to that if you 
  // switch machines you don't have to go look up the password, the browser
  // will hopefully offer it.
  markToSaveNewGist = () => {
    this.saveFn = this.saveNew;
  }
  markToUpdateGist =  () => {
    this.saveFn = this.saveOverExisting;
  }
  saveNew = async() => {
    this.setState({saving: true});
    const {data, github, addError, onSave, onClose} = this.props;
    const {pat} = this.state;
    let success = false;
    github.setPat(pat);
    try {
      const {id, name, date} = await github.createGist(data);
      gists.addGist(id, name, date);
      onSave(id);
      success = true;
    } catch (e) {
      addError(`could not create gist: ${e}`)
    }
    this.setState({saving: false});
    if (success) {
      // we apparently need to update the URL in order for the browser
      // to save the password.
      updateURL({loggedIn: true});
      await wait();
      updateURL({loggedIn: undefined})
      onClose();
    }
  }
  saveOverExisting = async() => {
    this.setState({saving: true});
    const {data, gistId, github, addError, onClose} = this.props;
    const {pat} = this.state;
    let success = false;
    github.setPat(pat);
    try {
      const {id, name, date} = await github.updateGist(gistId, data);
      gists.addGist(id, name, date);
      success = true;
    } catch (e) {
      addError(`could not update gist: ${e}`)
    }
    this.setState({saving: false});
    if (success) {
      onClose();
    }
  }
  render() {
    const {pat, saving} = this.state;
    const {gistId} = this.props;
    const canSave = pat && gistId;
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <div className="save-as-gist-pat">
            <div>Personal Access Token:&nbsp;</div>
            <div>
              <input type="text" name="username" value="unused" style={{display: 'none'}} onChange={noop} />
              <input
                type="password"
                value={pat}
                placeholder="personal access token"
                onChange={this.handlePATChange}
              />
            </div>
          </div>
          <p>
            <button
              className={classNames({disabled: !pat || saving})}
              type="submit"
              data-type="new"
              onClick={this.markToSaveNewGist}
            >Save to new Gist</button>
            <button
              className={classNames({disabled: !canSave || saving})}
              type="submit"
              data-type="update"
              onClick={this.markToUpdateGist}
            >Update Existing Gist</button>
          </p>
          <p>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/settings/tokens">Create a Personal Access Token</a> with only <b>gist</b> permissions.
            Paste it above. Note: This is a static website. Your personal access token
            is stored only locally in your browser and only accessible by this domain.
          </p>
        </form>
      </div>
    );
  }
}