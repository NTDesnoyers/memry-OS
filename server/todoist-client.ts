// Todoist client using Replit's Todoist integration
// Reference: connection:conn_todoist_01KCW49R8F3ZDFCTZBVPBS2ZFF

import { TodoistApi } from '@doist/todoist-api-typescript';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=todoist',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Todoist not connected');
  }
  return accessToken;
}

export async function getUncachableTodoistClient() {
  const token = await getAccessToken();
  return new TodoistApi(token);
}

export async function isTodoistConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function getTodoistProjects() {
  const api = await getUncachableTodoistClient();
  return api.getProjects();
}

export async function createTodoistTask(options: {
  content: string;
  description?: string;
  projectId?: string;
  priority?: number;
  dueString?: string;
  labels?: string[];
}) {
  const api = await getUncachableTodoistClient();
  return api.addTask(options);
}

export async function getTodoistTasks(projectId?: string) {
  const api = await getUncachableTodoistClient();
  if (projectId) {
    return api.getTasks({ projectId });
  }
  return api.getTasks();
}

export async function completeTodoistTask(taskId: string) {
  const api = await getUncachableTodoistClient();
  return api.closeTask(taskId);
}

export async function updateTodoistTask(taskId: string, options: {
  content?: string;
  description?: string;
  priority?: number;
  dueString?: string;
  labels?: string[];
}) {
  const api = await getUncachableTodoistClient();
  return api.updateTask(taskId, options);
}
