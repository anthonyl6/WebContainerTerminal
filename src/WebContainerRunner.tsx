'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';

type Props = {
  files: Record<string, { file: string; contents: string }>;
  entry?: string[];
};

const WebContainerRunner: React.FC<Props> = ({ files, entry = ['npm', 'start'] }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let fit: any;
    let terminal: Terminal;

    const run = async () => {
      const { getWebContainer } = await import('.');
      const { FitAddon } = await import('@xterm/addon-fit');

      terminal = new Terminal({ convertEol: true });
      fit = new FitAddon();
      terminal.loadAddon(fit);
      terminal.open(terminalRef.current!);
      fit.fit();

      const webcontainer = await getWebContainer();

      const fileSystemTree = Object.fromEntries(
        Object.entries(files).map(([path, { contents }]) => [
          path,
          { file: { contents } },
        ])
      );
      await webcontainer.mount(fileSystemTree);

      const install = await webcontainer.spawn('npm', ['install']);
      install.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );
      await install.exit;

      const start = await webcontainer.spawn(entry[0], entry.slice(1));
      start.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );
    };

    run();

    return () => {
      terminal?.dispose();
    };
  }, [files, entry]);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default WebContainerRunner;
