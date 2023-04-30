// extension.ts

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // simulate multiroot workspace with 3 project folders
  for (const name of ['project1', 'project2', 'project3']) {
    const ctrl = vscode.tests.createTestController(name, name);
    context.subscriptions.push(ctrl);
    const runHandler = testRunHandler(ctrl, name);
    createTestsForProjectFolder(ctrl);

    ctrl.createRunProfile(`Run Tests:${name}`, vscode.TestRunProfileKind.Run,
      async (request: vscode.TestRunRequest) => {
        await UI.clearTestResults();
        await runHandler(request);
      });
  }
}

function createTestsForProjectFolder(ctrl: vscode.TestController) {
  for (const outcome of ["pass", "fail", "skip"]) {
    ctrl.items.add(ctrl.createTestItem(outcome, outcome));
  }
}

function testRunHandler(ctrl: vscode.TestController, name: string) {
  return async (request: vscode.TestRunRequest) =>
    runProjectQueueAsync(ctrl.createTestRun(request, name), ctrl);
}

async function runProjectQueueAsync(run: vscode.TestRun, ctrl: vscode.TestController) {
  const projectQueue: vscode.TestItem[] = [];
  ctrl.items.forEach(c => projectQueue.push(c));

  for (const item of projectQueue) {
    // run queue sequentially
    if (run.token.isCancellationRequested)
      break;
    run.started(item);
    await new Promise(r => setTimeout(r, Math.random() * 5000));
    switch (item.label) {
      case "pass": run.passed(item); break;
      case "fail": run.failed(item, new vscode.TestMessage("failed")); break;
      case "skip": run.skipped(item); break;
    }
    run.appendOutput(item.label + " result updated\r\n", undefined, item);
  }

  await vscode.window.showInformationMessage(`\nAll tests have been updated for ${run.name}\n\nClick OK to call run.end() on ${run.name}'s TestRun`, { modal: true });
  run.end();
}


class UI {
  private static clearing = false;
  private constructor() {/**/ }
  static async clearTestResults() {
    // clear test UI results ONCE per TestRunRequest  (this is important when testing this bug, because otherwise you could be looking at the UI results of the previous run)
    if (!UI.clearing) {
      UI.clearing = true;
      await vscode.commands.executeCommand("testing.clearTestResults");
      UI.clearing = false;
    }
    while (UI.clearing) {
      await new Promise(r => setTimeout(r, 10));
    }
  }
}
