/**
 * Driver for Broadlink devices
 *
 * Copyright 2018-2019, R Wensveen
 *
 * This file is part of com.broadlink
 * com.broadlink is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * com.broadlink is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with com.broadlink.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const BroadlinkDevice = require('../../lib/BroadlinkDevice');
const DataStore = require('../../lib/DataStore.js')


class RM4miniDevice extends BroadlinkDevice {


	/**
	 * Store the given name at the first available place in settings.
	 * i.e. look for an entry 'RcCmd.' (where . is integer >= 0)
	 */
	async storeCmdSetting(cmdname) {

		let settings = this.getSettings()

		var idx = 0;
		let settingName = 'RcCmd' + idx;
		while (settingName in settings) {
			this._utils.debugLog(settingName);
			if (settings[settingName].length == 0) {
				this._utils.debugLog(this.getName() + ' - storeCmdSettings - setting = ' + settingName + ', name = ' + cmdname);
				let s = {
					[settingName]: cmdname
				}
				await this.setSettings(s);
				break;
			}
			idx++;
			settingName = 'RcCmd' + idx;
		}
	}


	/**
	 * During device initialisation, make sure the commands
	 * in the datastore are identical to the device settings.
	 */
	updateSettings() {

		let settings = this.getSettings()

		// clear all settings
		var idx = 0;
		let settingName = 'RcCmd' + idx;
		while (settingName in settings) {
			this.setSettings({ [settingName]: "" });
			idx++;
			settingName = 'RcCmd' + idx;
		}

		// set all settings to dataStore names
		idx = 0;
		settingName = 'RcCmd' + idx;
		this.dataStore.getCommandNameList().forEach(s => {
			this.setSettings({ [settingName]: s });
			idx++;
			settingName = 'RcCmd' + idx;
		});
	}

	/**
	 * Sends the given command to the device and triggers the flows
	 *
	 * @param  args['variable'] = command with name
	 */
	async executeCommand(args) {

		try {
			let cmd = args['variable'];

			this._utils.debugLog('executeCommand ' + cmd.name);

			// send the command
			let cmdData = this.dataStore.getCommandData(cmd.name)
			await this._communicate.send_IR_RF_data_red(cmdData)
			cmdData = null;

			let drv = this.getDriver();
			// RC_specific_sent: user entered command name
			drv.rm4_specific_cmd_trigger.trigger(this, {}, { 'variable': cmd.name })

			// RC_sent_any: set token
			drv.rm4_any_cmd_trigger.trigger(this, { 'CommandSent': cmd.name }, {})

		} catch (e) { ; }

		return Promise.resolve(true)
	}


	/**
	 * Get a list of all command-names
	 *
	 * @return  the command-name list
	 */
	onAutoComplete() {
		let lst = []
		let names = this.dataStore.getCommandNameList()
		for (var i = names.length - 1; i >= 0; i--) {
			let item = {
				"name": names[i]
			};
			lst.push(item)
		}
		return lst;
	}


	/**
	 *
	 */
	check_condition_specific_cmd_sent(args, state) {
		return Promise.resolve(args.variable.name === state.variable)
	}



	/**
	 *
	 */
	onInit() {
		super.onInit();
		this.registerCapabilityListener('learnIRcmd', this.onCapabilityLearnIR.bind(this));
		this.setCapabilityValue('learnIRcmd', false); // Turn off the capability after error

		this.dataStore = new DataStore(this.getData().mac)
		this.dataStore.readCommands(this.updateSettings.bind(this));
	}


	/**
	 * This method will be called when the learn state needs to be changed.
	 * @param onoff
	 */
	async onCapabilityLearnIR(onoff) {
		if (this.learn) {
			return false;
		}
		this.learn = true;

		try {
			await this._communicate.enter_learning();
			let data = await this._communicate.check_IR_data();
			if (data) {
				let idx = this.dataStore.dataArray.length + 1;
				let cmdname = 'cmd' + idx;
				this.dataStore.addCommand(cmdname, data);

				await this.storeCmdSetting(cmdname);
				this.setCapabilityValue('learnIRcmd', false); // Turn off the capability after success
				this.learn = false;
				return true;
			} else {
				this.setCapabilityValue('learnIRcmd', false); // Turn off the capability after failure
				this.learn = false;
				return false;
			}
		} catch (e) {
			this.setCapabilityValue('learnIRcmd', false); // Turn off the capability after error
			this._utils.debugLog('**> RM4miniDevice.onCapabilityLearnIR, rejected: ' + e);
			this.learn = false;
			return false;
		}
	}


	/**
	 * Called when the device settings are changed by the user
	 * (so NOT called on programmatically changing settings)
	 *
	 *  @param oldSettingsObj   contains the previous settings object
	 *  @param newSettingsObj   contains the new settings object
	 *  @param changedKeysArr   contains an array of keys that have been changed
	 *  @return {Promise<void>}
	 */
	async onSettings({ oldSettings, newSettings, changedKeys }) {
		this._utils.debugLog('Settings changed:', changedKeys);
		this._utils.debugLog('Old settings:', oldSettings);
		this._utils.debugLog('New settings:', newSettings);

		let i = 0;
		let oldName = '';
		let newName = '';

		// Verify all settings
		for (i = 0; i < changedKeys.length; i++) {
			oldName = oldSettings[changedKeys[i]] || '';
			newName = newSettings[changedKeys[i]] || '';

			this._utils.debugLog(`Changed setting key: ${changedKeys[i]}, Old value: ${oldName}, New value: ${newName}`);

			// Ensure oldName and newName are defined before checking length
			if (newName && newName.length > 0) {
				if (oldName && oldName.length > 0) {
					if (this.dataStore.findCommand(newName) >= 0) {
						this._utils.debugLog(`Error: Command ${newName} already exists`);
						throw new Error(this.homey.__('errors.save_settings_exist', { 'cmd': newName }));
					}
				} else {
					this._utils.debugLog(`Error: No old command found for new command ${newName}`);
					throw new Error(this.homey.__('errors.save_settings_nocmd', { 'cmd': newName }));
				}
			}
		}

		// All settings OK, process them
		for (i = 0; i < changedKeys.length; i++) {
			oldName = oldSettings[changedKeys[i]] || '';
			newName = newSettings[changedKeys[i]] || '';

			this._utils.debugLog(`Processing setting key: ${changedKeys[i]}, Old value: ${oldName}, New value: ${newName}`);

			if (newName && newName.length > 0) {
				this.dataStore.renameCommand(oldName, newName);
			} else {
				this.dataStore.deleteCommand(oldName);
			}
		}

		this._utils.debugLog('Settings successfully updated.');
	}



	/**
	 * This method will be called when a device has been removed.
	 */
	onDeleted() {
		this.dataStore.deleteAllCommands();
	}


}

module.exports = RM4miniDevice;
