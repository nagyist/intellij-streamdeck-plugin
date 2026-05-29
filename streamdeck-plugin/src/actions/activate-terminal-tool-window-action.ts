/*
 * Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
 */

import {DefaultAction} from "./default-action";

export class ActivateTerminalToolWindowAction extends DefaultAction<ActivateTerminalToolWindowAction> {
  actionId(): string {
    return "ActivateTerminalToolWindow";
  }

  actionTitle(): string {
    return "Terminal";
  }
}
