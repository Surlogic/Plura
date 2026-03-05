import Document, {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from 'next/document';

type DocumentProps = DocumentInitialProps & {
  nonce?: string;
};

export default class MyDocument extends Document<DocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    const nonceHeader = ctx.req?.headers['x-nonce'];
    const nonce = Array.isArray(nonceHeader) ? nonceHeader[0] : nonceHeader;
    return {
      ...initialProps,
      nonce,
    };
  }

  render() {
    const { nonce } = this.props;
    return (
      <Html lang="es">
        <Head nonce={nonce} />
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
