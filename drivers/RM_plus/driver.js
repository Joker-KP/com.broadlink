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

const BroadlinkRM3miniDriver = require("./../RM3_mini/driver");

class BroadlinkRMPlusDriver extends BroadlinkRM3miniDriver {

  async onInit() {
    super.onInit();
    this.setCompatibilityID(0x272a); // RM Pro Plus 2
	
    // Initialize and register flow card action for sending command specific to RM Plus
    this.rmplus_action_send_cmd = this.homey.flow.getActionCard("send_command_rmplus");
    this.rmplus_action_send_cmd
      .registerRunListener(this.do_exec_cmd.bind(this))
      .getArgument("variable")
      .registerAutocompleteListener((query, args) => {
        return args.device.onAutoComplete();
      });

    // Register a function to fill the trigger-flowcard 'RC_specific_sent' for RM Plus (see app.json)
    this.rmplus_specific_cmd_trigger = this.homey.flow.getDeviceTriggerCard("RC_specific_sent_rmplus");
    this.rmplus_specific_cmd_trigger
      .registerRunListener(this.check_condition_specific_cmd.bind(this))
      .getArgument("variable")
      .registerAutocompleteListener((query, args) => {
        return args.device.onAutoComplete();
      });

    // Register any command trigger for RM Plus
    this.rmplus_any_cmd_trigger = this.homey.flow.getDeviceTriggerCard("RC_sent_any_rmplus");
  }
}

module.exports = BroadlinkRMPlusDriver;
