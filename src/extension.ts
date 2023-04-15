// extension.ts

import * as vscode from 'vscode';

const projectFolders = ['project1', 'project2', 'project3'];

export function activate(context: vscode.ExtensionContext) {
	const ctrl = vscode.tests.createTestController('runtests', 'runtests');
	context.subscriptions.push(ctrl);
	const runHandler = testRunHandler(ctrl);

	// simulate multiroot workspace with 3 project folders
	for (const name of projectFolders) {
		const projectItem = ctrl.createTestItem(name, name);
		ctrl.items.add(projectItem);		
		createTestsForProjectFolder(ctrl, projectItem);
	}


	ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run,
		async (request: vscode.TestRunRequest) => {
			await vscode.commands.executeCommand("testing.clearTestResults");			
			await runHandler(request);
		});
}

function createTestsForProjectFolder(ctrl: vscode.TestController, parent: vscode.TestItem) {
	const outcomes = ["pass", "fail", "skip"];
	for (const outcome of outcomes) {
		const id = `${parent.label} ${outcome}`;
		const test = ctrl.createTestItem(id, id);
		ctrl.items.add(test);
		parent.children.add(test);
	}
}

function testRunHandler(ctrl: vscode.TestController) {
	// kick off each project folder test run async (i.e. in parallel)
	return async (request: vscode.TestRunRequest) => {
		for (const name of projectFolders) {
			const run = ctrl.createTestRun(request, name);
			const projectQueue = getProjectQueue(ctrl, name);
			ctrl.items.forEach(test => {if(test.id.startsWith(name + " ")) projectQueue.push(test);});
			projectQueue.forEach(test => run.enqueued(test));
			runProjectQueueAsync(run, projectQueue);
		}		
	};
}

async function runProjectQueueAsync(run:vscode.TestRun, projectQueue:vscode.TestItem[]) {
	for(const item of projectQueue) {
		// run queue sequentially
		if(run.token.isCancellationRequested)
			break;
		run.started(item);			
		await new Promise(r => setTimeout(r, Math.random() * 5000));
		switch(item.label.split(" ")[1]) {
			case "pass": run.passed(item); break;
			case "fail": run.failed(item, new vscode.TestMessage("failed")); break;
			case "skip": run.skipped(item); break;
		}
		run.appendOutput(item.label + " result updated\r\n", undefined, item);
	}
	await vscode.window.showInformationMessage(`all tests updated for ${run.name}. click OK to end run ${run.name}`, "OK");	
	run.end();
}

function getProjectQueue(ctrl:vscode.TestController, projectFolerName:string) {
	const pqItem = ctrl.items.get(projectFolerName);
	const queue: vscode.TestItem[] = [];
	pqItem?.children.forEach(c => queue.push(c));
	return queue;
}