import { createServer, type Server, type Socket } from 'node:net';

export type MockClient = {
  clid: string;
  cid: string;
  uid: string;
  nickname: string;
};

/**
 * Minimal TeamSpeak 3 ServerQuery (RAW protocol) server used in tests.
 *
 * It answers every command with `error id=0 msg=ok` and lets a test change the
 * client list *without* sending the matching notification - which is exactly
 * what happens when the query connection drops or an event gets lost.
 */
export class TsMockServer {
  private server: Server | null = null;
  private sockets = new Set<Socket>();
  clients: MockClient[] = [];
  channels: Array<{ cid: string; name: string }> = [
    { cid: '1', name: 'Default Channel' },
    { cid: '2', name: 'Channel Two' },
  ];
  receivedCommands: string[] = [];

  async listen(): Promise<number> {
    this.server = createServer((socket) => {
      this.sockets.add(socket);
      socket.setEncoding('utf8');
      socket.on('close', () => this.sockets.delete(socket));
      socket.on('error', () => this.sockets.delete(socket));
      // the two greeting lines a real server sends
      socket.write('TS3\n');
      socket.write(
        'Welcome to the TeamSpeak 3 ServerQuery interface, type "help" for a list of commands.\n',
      );

      let buffer = '';
      socket.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) this.handleLine(socket, line.trim());
      });
    });

    await new Promise<void>((resolve) => this.server?.listen(0, resolve));
    const address = this.server?.address();
    if (!address || typeof address === 'string')
      throw new Error('mock server did not bind a port');
    return address.port;
  }

  private handleLine(socket: Socket, line: string) {
    if (line === '') return; // keepalive
    this.receivedCommands.push(line);
    const [command] = line.split(' ');

    if (command === 'clientlist') {
      socket.write(`${this.clients.map(clientListEntry).join('|')}\n`);
    } else if (command === 'channellist') {
      socket.write(`${this.channels.map(channelListEntry).join('|')}\n`);
    } else if (command === 'version') {
      socket.write('version=3.13.7 build=1655727713 platform=Linux\n');
    }
    socket.write('error id=0 msg=ok\n');
  }

  /** pushes a raw notification to every connected query client */
  notify(line: string) {
    for (const socket of this.sockets) socket.write(`${line}\n`);
  }

  notifyClientEnter(client: MockClient) {
    this.clients.push(client);
    this.notify(
      `notifycliententerview cfid=0 ctid=${client.cid} reasonid=0 clid=${client.clid} client_unique_identifier=${client.uid} client_nickname=${client.nickname} client_type=0`,
    );
  }

  /** changes the state *silently*, simulating a missed/dropped event */
  setClientsSilently(clients: MockClient[]) {
    this.clients = clients;
  }

  /** drops all open query connections, simulating a network outage */
  dropConnections() {
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
  }

  async close() {
    this.dropConnections();
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
    this.server = null;
  }
}

const clientListEntry = (c: MockClient) =>
  [
    `clid=${c.clid}`,
    `cid=${c.cid}`,
    'client_database_id=1',
    `client_nickname=${c.nickname}`,
    'client_type=0',
    `client_unique_identifier=${c.uid}`,
  ].join(' ');

const channelListEntry = (c: { cid: string; name: string }) =>
  [`cid=${c.cid}`, 'pid=0', 'channel_order=0', `channel_name=${c.name}`].join(
    ' ',
  );
