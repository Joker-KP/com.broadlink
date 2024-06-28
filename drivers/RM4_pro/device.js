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

"use strict";

const BroadlinkDevice = require("../../lib/BroadlinkDevice");
const DataStore = require("./../../lib/DataStore.js");

class RM4ProDevice extends BroadlinkDevice {
  /**
   * Store the given name at the first available place in settings.
   * i.e. look for an entry 'RcCmd.' (where . is integer >= 0)
   */
  async storeCmdSetting(cmdname) {
    let settings = this.getSettings();

    var idx = 0;
    let settingName = "RcCmd" + idx;
    while (settingName in settings) {
      //this._utils.debugLog(this,  settingName );
      if (settings[settingName].length == 0) {
        //this._utils.debugLog(this, this.getName()+' - storeCmdSettings - setting = '+settingName+', name = ' + cmdname );
        let s = {
          [settingName]: cmdname,
        };
        await this.setSettings(s);
        break;
      }
      idx++;
      settingName = "RcCmd" + idx;
    }
  }

  /**
   * During device initialisation, make sure the commands
   * in the datastore are identical to the device settings.
   */
  updateSettings() {
    let settings = this.getSettings();
    this._utils.debugLog(null, "**> Current settings before update:", settings);

    // Clear all settings
    var idx = 0;
    let settingName = "RcCmd" + idx;
    while (settingName in settings) {
      this.setSettings({ [settingName]: "" });
      idx++;
      settingName = "RcCmd" + idx;
    }

    // Set all settings to dataStore names
    idx = 0;
    settingName = "RcCmd" + idx;
    const updates = {};
    this.dataStore.getCommandNameList().forEach((s) => {
      updates[settingName] = s;
      this._utils.debugLog(null, `**> Setting ${settingName} set to ${s}`);
      idx++;
      settingName = "RcCmd" + idx;
    });

    this.setSettings(updates)
      .then(() => {
        // Log the updated settings after saving
        const updatedSettings = this.getSettings();
        this._utils.debugLog(null, "**> Updated settings:", updatedSettings);
      })
      .catch((err) => {
        this._utils.debugLog(null, "**> Error updating settings:", err);
      });
  }

  /**
   * Sends the given command to the device and triggers the flows
   *
   * @param  args['variable'] = command with name
   */
  async executeCommand(args) {
    try {
      let cmd = args["variable"];

      this._utils.debugLog(this, "executeCommand " + cmd.name);

      // send the command
      let cmdData = this.dataStore.getCommandData(cmd.name);
      await this._communicate.send_IR_RF_data_rm4pro(cmdData);
      cmdData = null;

      let drv = this.driver;
      // RC_specific_sent: user entered command name
      drv.rm4_pro_specific_cmd_trigger.trigger(this, {}, { variable: cmd.name });

      // RC_sent_any: set token
      drv.rm4_pro_any_cmd_trigger.trigger(this, { CommandSent: cmd.name }, {});
    } catch (e) {
      this._utils.debugLog(this, `Error during command execution: ${e}`);
    }

    return Promise.resolve(true);
  }

  /**
   * Get a list of all command-names
   *
   * @return  the command-name list
   */
  onAutoComplete() {
    let lst = [];
    let names = this.dataStore.getCommandNameList();
    for (var i = names.length - 1; i >= 0; i--) {
      let item = {
        name: names[i],
      };
      lst.push(item);
    }
    return lst;
  }

  /**
   *
   */
  check_condition_specific_cmd_sent(args, state) {
    return Promise.resolve(args.variable.name === state.variable);
  }

  async onInit() {
    await super.onInit();
    this._utils.debugLog(this, "RM4 Pro Device onInit called");
    // Ensure the learnIRcmd capability exists and set its initial value
    if (!this.hasCapability("learnRFcmd")) {
      await this.addCapability("learnRFcmd");
    }

    // Ensure the learnIRcmd capability exists and set its initial value
    if (!this.hasCapability("learnIRcmd")) {
      await this.addCapability("learnIRcmd");
    }
    this.setCapabilityValue("learnIRcmd", false).catch(this.error);

    // Ensure the learningState capability exists and set its initial value
    if (!this.hasCapability("learningState")) {
      await this.addCapability("learningState");
    }

    // Ensure the learningStateRF capability exists and set its initial value
    if (!this.hasCapability("learningStateRF")) {
      await this.addCapability("learningStateRF");
    }

    // Ensure the humidity_rm4 capability exists and set its initial value
    if (!this.hasCapability("measure_humidity_rm4")) {
      await this.addCapability("measure_humidity_rm4");
    }

    // Ensure the temperature_rm4 capability exists and set its initial value
    if (!this.hasCapability("measure_temperature_rm4")) {
      await this.addCapability("measure_temperature_rm4");
    }

    // reset the state just in case of new init while app starting

    await this.setCapabilityValue("learnIRcmd", false).catch(this.error);
    await this.setCapabilityValue("learningState", false).catch(this.error);
    await this.setCapabilityValue("learnRFcmd", false).catch(this.error);
    await this.setCapabilityValue("learningStateRF", false).catch(this.error);

    this.registerCapabilityListener("learnIRcmd", this.onCapabilityLearnIR.bind(this));
    this.registerCapabilityListener("learnRFcmd", this.onCapabilityLearnRF.bind(this));

    try {
      this.dataStore = new DataStore(this.getData().mac);
      await this.dataStore.readCommands(async () => {
        this.updateSettings();
      });
    } catch (err) {
      if (err instanceof SyntaxError && err.message.includes("Unexpected token")) {
        this._utils.debugLog(this, `Device.onInit Error: ${err.message}`);
        await this.dataStore.deleteAllCommands();
        this._utils.debugLog(this, "Corrupted JSON detected and deleted.");
        this.updateSettings(); // Call updateSettings again after deleting corrupted JSON
      } else {
        this._utils.debugLog(this, `Device.onInit Error: ${err.message}`);
        throw err; // Re-throw if it's not the specific error we're handling
      }
    }

    this.homey.drivers.getDriver("RM4_pro").ready(() => {
      this._utils.debugLog(this, "RM4ProDevice: onInit: driver ready");
      // if the driver has a CheckInterval, set it. otherwise ignore it.
      let ci = this.getSetting("CheckInterval");
      if (ci) {
        this._utils.debugLog(this, "RM4ProDevice: onInit: start_check_interval");
        this.start_check_interval(ci);
      }
    });

    // Register polling for temperature and humidity

    this.pollInterval = setInterval(this.pollTempHumidity.bind(this), 60000); // Poll every 60 seconds

    if (!this.getSetting("key")) {
      this._utils.debugLog(this, `>> Key not known, launching autentification during OnInit <<`);
      await this.authenticateDevice();
    }
    await this.pollTempHumidity(); // Initial poll
  }

  /**
   * This method will be called when the learn state needs to be changed.
   * @param onoff
   */
  async onCapabilityLearnIR(onoff) {
    this._utils.debugLog(this, `onCapabilityLearnIR called with onoff: ${onoff}`);

    if (this.learnTimeout) {
      clearTimeout(this.learnTimeout); // Clear any existing timeout
    }

    this.learnTimeout = setTimeout(async () => {
      if (!onoff) {
        this._utils.debugLog(this, "Turning off learning mode");
        this.learn = false;
        await this.setCapabilityValue("learnIRcmd", false).catch(this.error);
        await this.setCapabilityValue("learningState", false).catch(this.error);
        return true;
      }

      if (this.learn) {
        this._utils.debugLog(this, "Learning mode already active, not restarting");
        return false;
      }

      this.learn = true;
      await this.setCapabilityValue("learningState", true).catch(this.error);
      this._utils.debugLog(this, "Starting IR learning mode");

      try {
        await this._communicate.enter_learning_red();
        this._utils.debugLog(this, "Entered learning mode");

        let data = await this._communicate.check_IR_data_red();
        this._utils.debugLog(this, `Checked IR data, data: ${data}`);

        if (data) {
          let idx = this.dataStore.dataArray.length + 1;
          let cmdname = "cmd" + idx;
          this.dataStore.addCommand(cmdname, data);

          await this.storeCmdSetting(cmdname);
          this._utils.debugLog(this, `Stored command: ${cmdname}`);

          await this.setCapabilityValue("learnIRcmd", false).catch(this.error); // Turn off the capability after success
          await this.setCapabilityValue("learningState", false).catch(this.error);
          setTimeout(() => this.setWarning(null), 5000, await this.setWarning(`Stored command: ${cmdname}`));
          this.learn = false;
          return true;
        } else {
          this._utils.debugLog(this, "No IR data received");
          await this.setCapabilityValue("learnIRcmd", false).catch(this.error); // Turn off the capability after failure
          await this.setCapabilityValue("learningState", false).catch(this.error);
          setTimeout(() => this.setWarning(null), 5000, await this.setWarning("IR learning timed out, no data received."));
          this.learn = false;
          return false;
        }
      } catch (e) {
        this._utils.debugLog(this, `Error during IR learning: ${e}`);
        await this.setCapabilityValue("learnIRcmd", false).catch(this.error); // Turn off the capability after error
        await this.setCapabilityValue("learningState", false).catch(this.error);
        setTimeout(() => this.setWarning(null), 5000, await this.setWarning(`IR learning failed: ${e}`));
        this.learn = false;
        return false;
      }
    }, 300); // Debounce duration in milliseconds (adjust as necessary)
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
    this._utils.debugLog(this, "Settings changed:", changedKeys);

    for (let i = 0; i < changedKeys.length; i++) {
      const key = changedKeys[i];
      const oldName = oldSettings[key] || "";
      const newName = newSettings[key] || "";

      this._utils.debugLog(this, `Changed setting key: ${key}, Old value: ${oldName}, New value: ${newName}`);

      if (newName && newName.length > 0) {
        if (oldName && oldName.length > 0) {
          if (this.dataStore.findCommand(newName) >= 0) {
            this._utils.debugLog(this, `Error: Command ${newName} already exists`);
            throw new Error(this.homey.__("errors.save_settings_exist", { cmd: newName }));
          }
          // Rename the command if the old name exists and new name is provided
          const renamed = await this.dataStore.renameCommand(oldName, newName);
          if (renamed) {
            this._utils.debugLog(this, `Command renamed from ${oldName} to ${newName}`);
          } else {
            this._utils.debugLog(this, `Failed to rename command ${oldName} to ${newName}`);
          }
        } else {
          this._utils.debugLog(this, `Error: No old command found for new command ${newName}`);
          throw new Error(this.homey.__("errors.save_settings_nocmd", { cmd: newName }));
        }
      } else {
        if (oldName && oldName.length > 0) {
          await this.dataStore.deleteCommand(oldName);
          this._utils.debugLog(this, `Command ${oldName} deleted.`);
        }
      }

      if (key === "ipAddress" && this._communicate) {
        this._communicate.setIPaddress(newSettings.ipAddress);
        this._utils.debugLog(this, `IP Address changed from ${oldSettings.ipAddress} to ${newSettings.ipAddress}`);
      }

      if (key === "Authenticate" && newName === true) {
        this._utils.debugLog(this, "Re-authenticating device due to settings change");
        let deviceData = this.getData();
        let options = {
          ipAddress: this.getSettings().ipAddress,
          mac: this._utils.hexToArr(deviceData.mac),
          count: Math.floor(Math.random() * 0xffff),
          id: null,
          key: null,
          homey: this.homey,
          deviceType: parseInt(deviceData.devtype, 16),
        };
        this._communicate.configure(options);
        await this.authenticateDevice();

        // Defer resetting the Authenticate setting
        process.nextTick(async () => {
          await this.setSettings({ Authenticate: false }).catch((e) => {
            this._utils.debugLog(this, "Error resetting Authenticate setting:", e.toString());
          });
        });
      }
    }

    this._utils.debugLog(this, "Settings successfully updated.");
  }

  async stopRfLearning() {
    try {
      await this._communicate.cancelRFSweep_rm4pro();
    } catch (e) {
      this._utils.debugLog(this, "**> stopRfLearning error : " + e);
    }

    await this.setCapabilityValue("learnRFcmd", false).catch(this.error);
    await this.setCapabilityValue("learningStateRF", false).catch(this.error);

    this.learn = false;
  }

  async onCapabilityLearnRF(onoff) {
    this._utils.debugLog(this, `onCapabilityLearnRF called with onoff: ${onoff}`);
    if (this.learn) {
      // Already learning, no need to restart
      return true;
    }
    this.learn = true;
    this.setCapabilityValue("learningStateRF", true).catch(this.error);

    setImmediate(async () => {
      let type = this.getData().devtype;
      try {
        var data;

        await this._communicate.enterRFSweep_rm4pro();

        if (this.isSpeechOutputAvailable()) {
          await this.homey.speechOutput.say(this.homey.__("rf_learn.long_press"));
        } else {
          setTimeout(() => this.setWarning(null), 6000, await this.setWarning(this.homey.__("rf_learn.long_press")));
        }

        const frequencyBytes = await this._communicate.checkRFData_rm4pro();
        let frequency =
          (frequencyBytes[0] | (frequencyBytes[1] << 8) | (frequencyBytes[2] << 16) | (frequencyBytes[3] << 24)) / 1000.0;

        setTimeout(() => this.setWarning(null), 2000, await this.setWarning("Frequency : ", frequency, "MHz"));

        this._utils.debugLog(this, `>>> Frequency bytes: ${frequencyBytes} <<<`);
        if (this.isSpeechOutputAvailable()) {
          await this.homey.speechOutput.say(this.homey.__("rf_learn.multi_presses"));
        } else {
          setTimeout(() => this.setWarning(null), 5000, await this.setWarning(this.homey.__("rf_learn.multi_presses")));
        }

        if (type == 0x279d || type == 0x27a9) {
          await this._communicate.enter_learning();
          data = await this._communicate.check_IR_data_red();
        } else {
          data = await this._communicate.checkRFData2_rm4pro(frequencyBytes);
        }

        if (data) {
          let idx = this.dataStore.dataArray.length + 1;
          let cmdname = "rf-cmd" + idx;
          this.dataStore.addCommand(cmdname, data);
          await this.storeCmdSetting(cmdname);
        }

        await this.stopRfLearning();

        if (this.isSpeechOutputAvailable()) {
          await this.homey.speechOutput.say(this.homey.__("rf_learn.done"));
        } else {
          setTimeout(() => this.setWarning(null), 5000, await this.setWarning(this.homey.__("rf_learn.done")));
        }
      } catch (e) {
        this._utils.debugLog(this, "**> Learning RF failed :", e);

        if (this.isSpeechOutputAvailable()) {
          await this.homey.speechOutput.say(this.homey.__("rf_learn.done"));
        } else {
          setTimeout(() => this.setWarning(null), 5000, await this.setWarning(this.homey.__("rf_learn.error")));
        }

        await this.stopRfLearning();
      }
    });

    return true;
  }

  /**
   * Checks if speech output is available on the current platform
   * @returns {boolean}
   */
  isSpeechOutputAvailable() {
    const platform = this.homey.platform;
    const platformVersion = this.homey.platformVersion;

    // Log the platform and platform version
    this._utils.debugLog(this, `SpeechOutput: platform=${platform}, platformVersion=${platformVersion}`);

    // Speech output is available only if the platform is "local" or undefined and the platform version is exactly 1
    if ((platform === "local" || platform === undefined) && platformVersion === 1) {
      return true;
    }

    // Otherwise, speech output is not available
    return false;
  }

  async pollTempHumidity() {
    try {
      const { temperature, humidity } = await this._communicate.checkTempHumidity_rm4pro();
      const tempValue = parseFloat(`${temperature[0]}.${temperature[1]}`);
      const humidityValue = parseFloat(`${humidity[0]}.${humidity[1]}`);

      await this.setCapabilityValue("measure_temperature_rm4", tempValue).catch(this.error);
      await this.setCapabilityValue("measure_humidity_rm4", humidityValue).catch(this.error);

      this._utils.debugLog(this, `Polled Temperature: ${tempValue} °C, Humidity: ${humidityValue} %`);
    } catch (err) {
      this._utils.debugLog(this, `Error polling temperature and humidity: ${err.message}`);
    }
  }

  /**
   * This method will be called when a device has been removed.
   */
  onDeleted() {
    this._utils.debugLog(this, "Device deleted, will be deleting all commands :" + this.getData().id);
    clearInterval(this.pollInterval); // Clear the polling interval
    this.dataStore.deleteAllCommands();
  }
}

module.exports = RM4ProDevice;
