'use client';

declare global {
  interface Window {
    __webcontainerInstance?: import('@webcontainer/api').WebContainer;
  }
}

export async function getWebContainer() {
  if (typeof window === 'undefined') {
    throw new Error('WebContainer must be used in the browser');
  }

  if (window.__webcontainerInstance) {
    return window.__webcontainerInstance;
  }

  const { WebContainer } = await import('@webcontainer/api');
  const instance = await WebContainer.boot();
  window.__webcontainerInstance = instance;
  return instance;
}
