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
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-[#0E2A47]">
          <h1 className="text-2xl font-semibold">Algo salió mal</h1>
          <p className="mt-2 text-[#64748B]">
            Ocurrió un error inesperado. Recargá la página para continuar.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-[#0E2A47] px-6 py-2 font-semibold text-white transition hover:brightness-110"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
