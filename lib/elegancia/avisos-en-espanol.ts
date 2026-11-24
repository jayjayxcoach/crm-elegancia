/**
 * Avisos del sistema en español (plantilla Elegancia).
 *
 * Los avisos automáticos del CRM se guardan en la base con el texto en
 * portugués (`lib/event-log/aviso-de-evento-morto.ts`). Aquí se traducen al
 * mostrarlos: solo las frases fijas del sistema; lo demás (nombres, motivos
 * técnicos) queda como vino.
 */
const FRASES: Array<[string, string]> = [
  // Títulos
  ["Uma tarefa automática parou de tentar", "Una tarea automática dejó de intentarlo"],
  ["A IA deixou de responder uma mensagem de cliente", "La IA dejó de responder un mensaje de una clienta"],
  ["Uma mensagem de WhatsApp não entrou no CRM", "Un mensaje de WhatsApp no entró al CRM"],
  ["Uma mensagem do número oficial não entrou no CRM", "Un mensaje del número oficial no entró al CRM"],
  ["Uma mensagem do número oficial ficou sem atendimento", "Un mensaje del número oficial quedó sin atender"],
  // Consecuencias
  [
    "Uma tarefa automática do sistema falhou e parou de tentar: o que ela ia fazer não aconteceu, e não será tentado de novo.",
    "Una tarea automática del sistema falló y dejó de intentarlo: lo que iba a hacer no ocurrió y no se volverá a intentar.",
  ],
  [
    "Um cliente escreveu e a IA não respondeu; se ele não escrever de novo, a conversa fica sem resposta. Abra o Inbox e responda as conversas que estão esperando.",
    "Una clienta escribió y la IA no respondió; si no vuelve a escribir, la conversación queda sin respuesta. Abre la Bandeja y responde las conversaciones que están esperando.",
  ],
  [
    "Um cliente mandou mensagem, mas o banco de dados estava indisponível e ela não pôde ser gravada, mesmo depois de várias tentativas. Ela não aparece no Inbox e a IA não a respondeu: confira no celular do número as conversas recebidas nesse horário e responda por lá.",
    "Una clienta mandó un mensaje, pero la base de datos no estaba disponible y no se pudo guardar, incluso después de varios intentos. No aparece en la Bandeja y la IA no lo respondió: revisa en el celular del número las conversaciones de ese horario y responde desde ahí.",
  ],
  [
    "Um cliente escreveu para o número oficial, mas a mensagem não pôde ser gravada, mesmo depois de várias tentativas. Ela não aparece no Inbox e a IA não a respondeu: confira no painel do provedor do número as conversas desse horário e responda por lá.",
    "Una clienta escribió al número oficial, pero el mensaje no se pudo guardar, incluso después de varios intentos. No aparece en la Bandeja y la IA no lo respondió: revisa en el panel del proveedor del número las conversaciones de ese horario y responde desde ahí.",
  ],
  [
    "Um cliente escreveu para o número oficial e a mensagem está no Inbox, mas o processamento dela parou no meio e o prazo para retomá-lo passou. A IA não vai responder essa mensagem e nenhum negócio nasce dela: confira as conversas desse horário e responda por lá.",
    "Una clienta escribió al número oficial y el mensaje está en la Bandeja, pero su procesamiento se detuvo a mitad y pasó el plazo para retomarlo. La IA no va a responder ese mensaje y no se crea ningún pedido: revisa las conversaciones de ese horario y responde desde ahí.",
  ],
  // Rearmes
  [
    "Enquanto este aviso estiver aberto, outras tarefas automáticas que pararem de tentar não abrem aviso novo (a IA que deixa de responder um cliente abre o seu próprio): depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.",
    "Mientras este aviso esté abierto, otras tareas automáticas que dejen de intentarlo no abren un aviso nuevo (la IA que deja de responder a una clienta abre el suyo): cuando se corrija la causa, márcalo como resuelto para volver a recibir avisos.",
  ],
  [
    "Enquanto este aviso estiver aberto, outras respostas da IA que pararem de tentar não abrem aviso novo: depois de corrigida a causa, marque-o como resolvido para voltar a ser avisado.",
    "Mientras este aviso esté abierto, otras respuestas de la IA que dejen de intentarlo no abren un aviso nuevo: cuando se corrija la causa, márcalo como resuelto para volver a recibir avisos.",
  ],
  [
    "Enquanto este aviso estiver aberto, outras mensagens que também não entrarem não abrem aviso novo: depois de conferir, marque-o como resolvido para voltar a ser avisado.",
    "Mientras este aviso esté abierto, otros mensajes que tampoco entren no abren un aviso nuevo: después de revisar, márcalo como resuelto para volver a recibir avisos.",
  ],
  [
    "Enquanto este aviso estiver aberto, outras mensagens do número oficial que também não entrarem não abrem aviso novo: depois de conferir, marque-o como resolvido para voltar a ser avisado.",
    "Mientras este aviso esté abierto, otros mensajes del número oficial que tampoco entren no abren un aviso nuevo: después de revisar, márcalo como resuelto para volver a recibir avisos.",
  ],
  [
    "Enquanto este aviso estiver aberto, outras mensagens na mesma situação não abrem aviso novo: depois de conferir, marque-o como resolvido para voltar a ser avisado.",
    "Mientras este aviso esté abierto, otros mensajes en la misma situación no abren un aviso nuevo: después de revisar, márcalo como resuelto para volver a recibir avisos.",
  ],
  // Detalle técnico
  ["Detalhe técnico, para quem der suporte:", "Detalle técnico, para quien dé soporte:"],
  ["nenhuma tentativa", "ningún intento"],
];

export function avisoEnEspanol(texto: string | null | undefined): string {
  if (!texto) return "";
  let s = texto;
  for (const [pt, es] of FRASES) if (s.includes(pt)) s = s.split(pt).join(es);
  return s
    .replace(/(\d+) tentativas?/g, (_, n: string) => (n === "1" ? "1 intento" : `${n} intentos`))
    .replace(/\bmotivo:/g, "motivo:");
}
