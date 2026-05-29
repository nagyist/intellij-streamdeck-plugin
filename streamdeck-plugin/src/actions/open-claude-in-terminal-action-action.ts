/*
 * Copyright 2000-2026 JetBrains s.r.o. and contributors. Use of this source code is governed by the Apache 2.0 license.
 */

import {DefaultAction} from "./default-action";

export class OpenClaudeInTerminalActionAction extends DefaultAction<OpenClaudeInTerminalActionAction> {
  actionId(): string {
    return "com.anthropic.code.plugin.actions.OpenClaudeInTerminalAction";
  }

  actionTitle(): string {
    return "Claude Code";
  }
}
