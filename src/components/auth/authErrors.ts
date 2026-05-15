/** Vercel preview / branch URLs are not Firebase authorized domains by default. */
export function isVercelPreviewHostname(hostname: string): boolean {
  return (
    hostname.includes("-projects.vercel.app") || hostname.includes("-git-")
  );
}

export function pendingSignInFailureMessage(hostname: string): string {
  const previewHint = isVercelPreviewHostname(hostname)
    ? " Use a URL de produção (ex.: tertoct.vercel.app), não o link Visit do deploy."
    : "";
  return (
    `Login não completou. Tente de novo em Safari ou Chrome (evite navegador embutido de apps).` +
    `${previewHint} Domínio atual: ${hostname} — confira Firebase → Authentication → Domínios autorizados.`
  );
}

export function mapAuthError(error: unknown): string {
  const authError = error as { code?: string; message?: string };

  switch (authError.code) {
    case "permission-denied":
      return "Não foi possível sincronizar seu cadastro (permissão negada). Tente de novo ou fale com o suporte.";
    case "auth/unauthorized-domain": {
      const host =
        typeof window !== "undefined" ? window.location.hostname : null;
      if (!host) {
        return "Este domínio não está autorizado no Firebase Authentication.";
      }
      const previewHint = isVercelPreviewHostname(host)
        ? " Use tertoct.vercel.app em vez do link Visit do deploy."
        : "";
      return `Domínio não autorizado no Firebase: "${host}".${previewHint} Adicione em Authentication → Domínios autorizados.`;
    }
    case "auth/operation-not-allowed":
      return "Login com Google não está habilitado no Firebase Authentication.";
    case "auth/popup-blocked":
      return "O navegador bloqueou o pop-up de login.";
    case "auth/popup-closed-by-user":
      return "O login foi fechado antes de concluir.";
    case "auth/network-request-failed":
      return "Falha de rede durante o login. Tente novamente.";
    default:
      return authError.message ?? "Não foi possível concluir o login.";
  }
}
