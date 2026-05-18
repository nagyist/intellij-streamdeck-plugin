/*
 * Copyright 2000-2024 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
 */

import {
  SDOnPiEvent,
  StreamDeckPropertyInspectorHandler,
  DidReceiveSettingsEvent,
} from 'streamdeck-typescript'
import {
  isGlobalSettingsSet
} from './utils'
import {
  GlobalSettingsInterface,
  ActionSettingsInterface,
} from './utils/interface'

const pluginName = 'com.jetbrains.idea'

/**
 * Load and save settings.
 * A class that extends `StreamDeckPropertyInspectorHandler` to manage and interact with the Stream Deck's property inspector.
 * It provides methods for handling document loaded events, initializing HTML input elements, saving settings, and updating
 * the UI based on the received settings. The class is designed to work with a set of predefined HTML input elements that
 * control various aspects such as host, port, password, and action configurations.
 *
 * @class
 */
class IdeaPI extends StreamDeckPropertyInspectorHandler {
  // Global settings
  /**
   * Represents the host HTML input element.
   * This variable is used to reference and manipulate the DOM input element
   * that acts as the host for certain functionalities or bindings.
   *
   * @type {HTMLInputElement}
   */
  private hostElement: HTMLInputElement;
  /**
   * Represents an HTML input element used for specifying a port number.
   * This element is typically used in forms where users need to enter a port
   * for network or web server configurations.
   *
   * @type {HTMLInputElement}
   */
  private portElement: HTMLInputElement;
  /**
   * Represents an HTML input element of type password.
   * This variable is used to reference and manipulate the password input field in the DOM.
   * It can be utilized to get or set the value, add event listeners, or modify attributes related to the password input.
   */
  private passwordElement: HTMLInputElement;
  // Action settings
  /**
   * Represents an HTML input element that is used to trigger or represent an action.
   * This could be a button, checkbox, or any other input type that initiates an event or state change within the user interface.
   * @type {HTMLInputElement}
   */
  private actionElement: HTMLInputElement;
  /**
   * Represents an HTML input element used for specifying the name of a run configuration.
   * This element is typically part of a form or settings panel where users can define
   * or modify the name of a specific run configuration, which is crucial for identifying
   * and managing different execution setups in development environments.
   */
  private runConfigurationNameElement: HTMLInputElement;
  /**
   * Represents an HTML input element used for specifying the port number in a form.
   * This element is typically used in network or server configuration forms where
   * users can enter a port number to define a communication endpoint.
   *
   * @type {HTMLInputElement}
   */
  private actionPortElement: HTMLInputElement;

  constructor() {
    super()
  }

  /**
   * Handles the document loaded event, performing necessary actions based on the action information.
   * It checks if the run configuration name should be shown and updates the display of the run configuration
   * name input box accordingly. Additionally, it sets up click event listeners for elements with a `data-open-url` attribute,
   * allowing them to open URLs when clicked.
   *
   * @return {void} This function does not return any value.
   */
  @SDOnPiEvent('documentLoaded')
  onDocumentLoaded(): void {
    console.log('onDocumentLoaded() will check if run configuration name should be shown for ' + this.actionInfo.action)

    const runConfig = document.getElementById('run_config') as HTMLDivElement
    // this.mainElement = document.getElementById(
    //     'mainSettings'
    // ) as HTMLElement;
    // this.mainElement.style.display = 'initial';
    switch (this.actionInfo.action) {
      case pluginName + '.run':
      case pluginName + '.debug':{
        runConfig.className = 'sdpi-item' // Remove hidden class and display run configuration name input box
        break
      }
    }

    // Open all URL in HTML like this: <a data-open-url="https://github.com/JetBrains/intellij-streamdeck-plugin/issues">Bugtracker</a>
    document.querySelectorAll('[data-open-url]').forEach(e => {
      const value = e.getAttribute('data-open-url');
      if(value) {
        e?.addEventListener('click', () => {
          this.openUrl(value)
        })

      } else {
        console.log(`${value} is not a supported url`);
      }
    });

  }

  @SDOnPiEvent('setupReady')
  private documentLoaded() {

  }

  /**
   * Initializes the input elements for the host, port, password, action, run configuration name, and action port.
   * This method queries the document for each element by its ID and assigns it to a corresponding class property,
   * casting the result to HTMLInputElement.
   *
   * @return {void} This method does not return any value.
   */
  private initElements(): void {
    this.hostElement = document.getElementById('host') as HTMLInputElement;
    this.portElement = document.getElementById('port') as HTMLInputElement;
    this.passwordElement = document.getElementById(
        'password'
    ) as HTMLInputElement;
    this.actionElement = document.getElementById('action') as HTMLInputElement;
    this.runConfigurationNameElement = document.getElementById('run_config_name') as HTMLInputElement;
    this.actionPortElement = document.getElementById('action_port') as HTMLInputElement;
  }

  /**
   * Saves all the current settings including global and specific settings.
   * Global settings include password, host, and port which are set using the settingsManager.
   * Specific settings include action, run configuration name, and action port.
   * @return {void}
   */
  private saveAllSettings(): void {
    const password = this.passwordElement?.value
    const host = this.hostElement?.value
    const port = this.portElement?.value
    this.settingsManager.setGlobalSettings({ password, host, port })

    this.setSettings({
      action: this.actionElement?.value ?? "",
      runConfig: this.runConfigurationNameElement?.value ?? "",
      port: this.actionPortElement?.value ?? ""
    })
  }

  /**
   * Registers an auto-save feature for the settings. This method attaches an 'input' event listener
   * to specified elements which triggers the saveAllSettings function whenever the input changes.
   *
   * @return {void} This method does not return any value.
   */
  private registerAutoSave() {
    [
      // Global
      this.hostElement,
      this.portElement,
      this.passwordElement,
      // Action
      this.actionElement,
      this.runConfigurationNameElement,
      this.actionPortElement
    ].forEach(el => el?.addEventListener('input', () => this.saveAllSettings()))
  }

  /**
   * Prefill PI elements from cache。
   * Handles the event when the property inspector appears.
   * This method initializes the elements, registers for auto-save, and requests settings.
   * It also updates the UI with the global settings if they are available.
   *
   * @return {void}
   */
  @SDOnPiEvent('globalSettingsAvailable')
  propertyInspectorDidAppear(): void {
    console.log('propertyInspectorDidAppear()')
    this.initElements();
    this.registerAutoSave();
    this.requestSettings()
    const globalSettings = this.settingsManager.getGlobalSettings<GlobalSettingsInterface>()

    if (isGlobalSettingsSet(globalSettings)) {
      const password = globalSettings.password;
      if(password) {
        this.passwordElement.value = password;
      }
      const host = globalSettings.host;
      if(host) {
        this.hostElement.value = host;
      }

      const port = globalSettings.port;
      if(port) {
        this.portElement.value = port;
      }
    }
  }

  /**
   * Update per button settings.
   * Handles the reception of settings and updates the corresponding UI elements.
   *
   * @param {DidReceiveSettingsEvent<ActionSettingsInterface>} - The event object containing the payload with new settings.
   * @return {void} This method does not return any value.
   */
  @SDOnPiEvent('didReceiveSettings')
  onReceiveSettings({
                      payload,
                    }: DidReceiveSettingsEvent<ActionSettingsInterface>): void {
    console.log("onReceiveSettings()")
    console.log("payload.settings=" + JSON.stringify(payload.settings))
    console.log("this.actionElement=" + this.actionElement.getHTML())

    // This method will be called two times, the first time actionElement is undefined
    if(this.actionElement) {
      this.actionElement.value = payload.settings.action ?? "";
    }

    if(this.runConfigurationNameElement) {
      this.runConfigurationNameElement.value = payload.settings.runConfig ?? "";
    }

    if(this.actionPortElement) {
      this.actionPortElement.value = payload.settings.port ?? "";
    }
  }
}

new IdeaPI()
