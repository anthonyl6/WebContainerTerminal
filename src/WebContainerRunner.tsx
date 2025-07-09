'use client';

import React, { useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CanvasAddon } from '@xterm/addon-canvas';


type Props = {
  files: Record<string, { file: string; contents: string }>;
  entry?: string[];
  terminal: Terminal;
  terminalRef: React.RefObject<HTMLDivElement>;
};

const WebContainerRunner: React.FC<Props> = ({ files, entry = ['npm', 'start'], terminal, terminalRef }) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let fit: FitAddon;

    console.log("Loaded...")

    // Check if FitAddon is already loaded
    const existingFit = (terminal as any)._core?._addons?.find?.((addon: any) => addon instanceof FitAddon);
    if (existingFit) {
      fit = existingFit;
    } else {
      fit = new FitAddon();
      terminal.loadAddon(fit);
    }

    // const canvasAddon = new CanvasAddon();
    // terminal.loadAddon(canvasAddon);

    terminal.open(terminalRef.current);
    fit.fit();

    const run = async () => {
      const { getWebContainer } = await import('.');
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

      const handleWindowResize = () => {
        fit.fit();
        console.log("Resizing webcontainer...")

        const charWidth = terminal.cols;
        const charHeight = terminal.rows;
        webcontainer.spawn('node', ['-e', `global.triggerBlessedResize(${charWidth}, ${charHeight})`]);
      };
      window.addEventListener('resize', handleWindowResize);
    };

    run();

    return () => {
      terminal?.dispose();
    };
  }, [files, entry]);

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />;
};

export default WebContainerRunner;
