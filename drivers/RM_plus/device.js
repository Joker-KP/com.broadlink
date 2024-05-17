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

const RM3MiniDevice = require('./../RM3_mini/device');


class RmPlusDevice extends RM3MiniDevice {


	async onInit() {
		super.onInit();
		this.learn = false;

		this.registerCapabilityListener('learnRFcmd', this.onCapabilityLearnRF.bind(this));
	}


	onCapabilityLearnMode() {
		return false;
	}


	/**
	 * 
	 */
	async stopRfLearning() {
		try {
			await this._communicate.cancelRFSweep();
		} catch (e) {
			this._utils.debugLog('**> stopRfLearning: ' + e)
		}
		this.learn = false;
	}


	/**
	 * This method will be called when the learn state needs to be changed.
	 * @param onoff
	 * @return \c TRUE if successful, \c FALSE otherwise
	 */
	async onCapabilityLearnRF(onoff) {
		if (this.learn) {
			return true;
		}
		this.learn = true;

		let type = this.getData().devtype
		try {
			var data;
			await this._communicate.enterRFSweep()

			if (this.homey.speechOutput) {
				await this.homey.speechOutput.say(this.homey.__('rf_learn.long_press'));
			} else {
				await this.homey.notifications.createNotification({
					excerpt: this.homey.__('rf_learn.long_press')
				});
			}

			await this._communicate.checkRFData()

			if (this.homey.speechOutput) {
				await this.homey.speechOutput.say(this.homey.__('rf_learn.multi_presses'));
			} else {
				await this.homey.notifications.createNotification({
					excerpt: this.homey.__('rf_learn.multi_presses')
				});
			}

			if ((type == 0x279D) || (type == 0x27A9)) {
				await this._communicate.enter_learning()
				data = await this._communicate.check_IR_data()
			}
			else {
				data = await this._communicate.checkRFData2()
			}
			if (data) {
				let idx = this.dataStore.dataArray.length + 1;
				let cmdname = 'rf-cmd' + idx;
				this.dataStore.addCommand(cmdname, data);
				await this.storeCmdSetting(cmdname);
			}
			await this.stopRfLearning();

			if (this.homey.speechOutput) {
				await this.homey.speechOutput.say(this.homey.__('rf_learn.done'));
			} else {
				await this.homey.notifications.createNotification({
					excerpt: this.homey.__('rf_learn.done')
				});
			}

			return true;

		} catch (e) { }

		this._utils.debugLog('**> Learing RF failed')

		if (this.homey.speechOutput) {
			await this.homey.speechOutput.say(this.homey.__('rf_learn.done'));
		} else {
			await this.homey.notifications.createNotification({
				excerpt: this.homey.__('rf_learn.done')
			});
		}

		await this.stopRfLearning();
		return false;
	}

}

module.exports = RmPlusDevice;
