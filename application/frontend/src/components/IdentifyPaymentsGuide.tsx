import Accordion from "./Accordion";

type Props = {
  defaultOpen?: boolean;
};

export default function IdentifyPaymentsGuide({ defaultOpen = false }: Props) {
  return (
    <Accordion className="guide" title="O jeito certo de identificar um pagamento" defaultOpen={defaultOpen}>
      <p>
        O saldo do grupo só é confiável com o crédito no banco. Mensalidade, produto de projeto e bebidas no mesmo dia
        só se separam se cada pagamento tiver um motivo — ou se a soma for partida na conciliação.
      </p>
      <ol>
        <li>
          <strong>Um PIX, um motivo.</strong> Três QR Codes (mensalidade, produto do projeto, cantina). Mesmo associado,
          mesmo dia: o banco traz três linhas, cada uma já classificada no ramo e na rubrica.
        </li>
        <li>
          <strong>Um PIX com a soma.</strong> Só funciona com um pedido antes (ex.: 60 + 70 + 20 = 150). O crédito de
          150 entra uma vez no caixa e parte em três lançamentos. Sem pedido, vira crédito sem rubrica até o tesoureiro
          usar <strong>Ratear</strong> no fluxo de caixa.
        </li>
        <li>
          <strong>Cartão de crédito.</strong> O Sicredi quase nunca traz o nome do associado. A maquininha liquida
          depois, num valor líquido (várias vendas juntas, menos a taxa). Quem identifica é o comprovante da máquina ou
          o relatório da operadora (NSU, autorização, valor bruto). Cada venda vira o lançamento da rubrica; o crédito
          no banco concilia a soma líquida. A taxa da maquininha é saída à parte. Comprovante do cartão da família não
          entra no caixa do grupo.
        </li>
        <li>
          <strong>Comprovante não lança sozinho.</strong> Foto ou PDF só casa com a linha do extrato (PIX) ou com a
          venda da operadora (cartão). Data e nome não bastam: no mesmo dia pode haver mais de um pagamento.
        </li>
      </ol>
      <p className="muted">
        Na conciliação, a soma das partes tem de bater centavo a centavo com o valor do banco (PIX) ou com o valor bruto
        das vendas menos a taxa (cartão). Extrato genérico não diz o rateio.
      </p>
    </Accordion>
  );
}
