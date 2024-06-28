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

const fs = require("fs");
const BroadlinkUtils = require("./../lib/BroadlinkUtils.js");

class DataStore {
  /**
   *
   * holds an Array with records:
   *    {
   *       name     [String]
   *       cmd      [Uint8Array]
   *    }
   *
   * Note: the 'name' is also stored in the device settings.
   * the Array and the Settings may have a different order of names.
   */

  /**
   * Class constructor, needed to define class-variables
   */

  constructor(storeName, homey) {
    this.dataArray = [];
    this.storeName = storeName;
    this._utils = new BroadlinkUtils(homey);
  }

  /**
   * @returns: -1 if not found, index-in-array otherwise
   */
  findCommand(cmdName) {
    for (var i = 0, len = this.dataArray.length; i < len; i++) {
      if (this.dataArray[i].name === cmdName) {
        return i;
      }
    }
    return -1;
  }

  /**
   * saveOnCloseEvent() is called during init and registeres the unload event. The unload
   * event is called just before the app is being closed (for instance when the app is updated,
   * homey is shutting down).
   */
  //saveOnCloseEvent() {
  //
  //   Homey.on( 'unload', function() {
  //      this._utils.debugLog(this, "unload called");
  //      this.storeCommands();
  //   });
  //}

  /**
   * saveUserData() saves the user data into a JSON file on the filesystem
   */
  async storeCommands() {
    const fileName = `/userdata/${this.storeName}.json`;
    const tempFileName = `${fileName}.tmp`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = JSON.stringify(this.dataArray);

        // Check if data is null, undefined, or an empty string
        if (!data || data === "null" || data === "undefined") {
          throw new Error("Data is null, undefined, or an empty string");
        }

        // Check if data is an empty array
        const parsedData = JSON.parse(data);
        if (Array.isArray(parsedData) && parsedData.length === 0) {
          throw new Error("Data is an empty array");
        }

        this._utils.debugLog(this, `Storing commands to temporary file: ${tempFileName} (Attempt ${attempt})`);

        // Write data to a temporary file
        await fs.promises.writeFile(tempFileName, data);

        // Validate the temporary file
        const tempFileData = await fs.promises.readFile(tempFileName, "utf8");
        const tempParsedData = JSON.parse(tempFileData);

        // Additional validation: Ensure structure matches expected format
        if (!Array.isArray(tempParsedData) || tempParsedData.some((item) => !item.name || !item.cmd)) {
          throw new Error("Validation failed: Temporary file structure is invalid");
        }

        // Rename the temporary file to the target file
        await fs.promises.rename(tempFileName, fileName);
        this._utils.debugLog(this, `**> Data successfully stored <**`);
        return;
      } catch (err) {
        this._utils.debugLog(this, `**> Storing dataArray failed (Attempt ${attempt}): ${err}`);
        if (attempt === maxRetries) {
          throw new Error(`Failed to store commands after ${maxRetries} attempts: ${err}`);
        }
      }
    }
  }

  /**
   * @params callback    function called once all data has been read
   */
  readCommands() {
    return new Promise((resolve, reject) => {
      let fileName = "/userdata/" + this.storeName + ".json";

      // Check if the file exists, and if it is readable and writable.
      fs.access(fileName, fs.constants.F_OK | fs.constants.W_OK | fs.constants.R_OK, (err) => {
        if (err) {
          this._utils.debugLog(null, "**> file does not exist or no access: " + err);
          return resolve();
        } else {
          fs.readFile(fileName, "utf8", (err, data) => {
            if (err) {
              this._utils.debugLog(null, "**> readFile error: " + err);
              return reject(err);
            } else {
              try {
                this.dataArray = [];
                let arr = JSON.parse(data);

                //console.log('**> JSON data parsed successfully:');
                //console.log(arr); // Debug log to see the parsed JSON data

                for (let i = 0; i < arr.length; i++) {
                  let elem = {
                    name: arr[i].name,
                    cmd: new Uint8Array(Object.values(arr[i].cmd)),
                  };
                  this.dataArray.push(elem);

                  //this._utils.debugLog(null, `**> Command ${i} added:`, elem); // Debug log for each command added
                }
                return resolve();
              } catch (err) {
                this._utils.debugLog(null, "**> parse failed: " + err);
                return reject(err);
              }
            }
          });
        }
      });
    });
  }

  /**
   *
   */
  async deleteAllCommands() {
    this.dataArray = [];
  
    let fileName = `/userdata/${this.storeName}.json`;
  
    try {
      // Await the storeCommands method to ensure it completes
      await this.storeCommands();
    } catch (err) {
      // Log any errors from storeCommands
      this._utils.debugLog(this, `**> Failed to store commands before deleting: ${err.message}`);
    }
  
    // Unconditionally attempt to delete the file
    fs.unlink(fileName, (err) => {
      if (err) {
        this._utils.debugLog(this, `**> Cannot remove file ${fileName}, err = ${err}`);
      } else {
        this._utils.debugLog(this, `**> File ${fileName} successfully deleted.`);
      }
    });
  }
  

  /**
   * @return: true if command stored, false otherwise
   */
  async addCommand(cmdName, data) {
    try {
      let element = this.findCommand(cmdName);
      if (element < 0) {
        let cmd = {
          name: cmdName,
          cmd: data,
        };
        this.dataArray.push(cmd);

        await this.storeCommands();
        return true;
      } else {
        return false;
      }
    } catch (err) {
      this._utils.debugLog(this, `**> Failed to add command: ${err.message}`);
      return false;
    }
  }

  /**
   *
   */
  async deleteCommand(cmdName) {
    try {
      
      this._utils.debugLog(this, `Attempting to delete command: ${cmdName}`);

      // Filter out the command to be deleted
      this.dataArray = this.dataArray.filter((item) => item.name !== cmdName);

      await this.storeCommands();

      this._utils.debugLog(this, `Command ${cmdName} successfully deleted.`);
    } catch (err) {
      // Log any errors
      this._utils.debugLog(this, `**> Failed to delete command: ${err.message}`);
    }
  }

  /**
   * @return: true if renamed, false otherwise
   */
  async renameCommand(oldName, newName) {
    try {
      
      this._utils.debugLog(this, `Attempting to rename command from ${oldName} to ${newName}`);
  
      let element = this.findCommand(newName);
      if (element >= 0) {
        this._utils.debugLog(this, `Command with name ${newName} already exists.`);
        return false;
      }
  
      element = this.findCommand(oldName);
      if (element >= 0) {
        this.dataArray[element].name = newName;
  
        
        await this.storeCommands();
  
        // Log success
        this._utils.debugLog(this, `Command ${oldName} successfully renamed to ${newName}.`);
        return true;
      } else {
        this._utils.debugLog(this, `Command with name ${oldName} not found.`);
        return false;
      }
    } catch (err) {
      // Log any errors
      this._utils.debugLog(this, `**> Failed to rename command: ${err.message}`);
      return false;
    }
  }

  /**
   * @return {Uint8Array} commanddata
   */
  getCommandData(cmdName) {
    try {
      let element = this.findCommand(cmdName);
      if (element >= 0) {
        this._utils.debugLog(this, `Command data for ${cmdName} found.`);
        return this.dataArray[element].cmd;
      } else {
        this._utils.debugLog(this, `Command data for ${cmdName} not found.`);
        throw new Error(`Command ${cmdName} not found.`);
      }
    } catch (err) {
      this._utils.debugLog(this, `**> Error retrieving command data: ${err.message}`);
      throw err;
    }
  }
  

  /**
   * Get a list of the names of all commands
   */
  getCommandNameList() {
    try {
      const nameList = this.dataArray.map(item => item.name);
      this._utils.debugLog(this, `Command name list generated: ${nameList}`);
      return nameList;
    } catch (err) {
      this._utils.debugLog(this, `**> Error generating command name list: ${err.message}`);
      return [];
    }
  }
}

module.exports = DataStore;
