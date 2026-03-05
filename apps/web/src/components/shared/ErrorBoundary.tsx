import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0E2A47' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Algo salió mal</h1>
          <p style={{ marginTop: '0.5rem', color: '#64748B' }}>
            Ocurrió un error inesperado. Recargá la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: '9999px', backgroundColor: '#0E2A47', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
