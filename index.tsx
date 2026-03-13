
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: any, errorInfo: any) {
    console.error("Crash fatal detectado:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-10 text-center">
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Ops! Algo deu errado.</h1>
            <p className="text-slate-500 font-medium">Ocorreu um erro crítico que impediu o carregamento do sistema. Por favor, recarregue a página.</p>
            <button onClick={() => window.location.reload()} className="px-10 py-4 bg-[#004282] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Recarregar Sistema</button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
