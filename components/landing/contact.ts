// Única fuente de los datos de contacto de la landing (spec landing.md
// CA-2.1, CA-2.3, CA-2.5). No repetir estas URLs a mano en otro archivo.

/** WhatsApp con el mensaje precargado de la spec (5.5), codificado. */
export const WHATSAPP_DEMO_URL =
  "https://wa.me/5493624105311?text=Hola%2C%20vi%20MenuSky%20y%20quiero%20pedir%20una%20demo%20para%20mi%20restaurante%2C%20bar%20o%20caf%C3%A9.";

/** Email con asunto y cuerpo precargados (copiado tal cual de CA-2.3). */
export const EMAIL_DEMO_URL =
  "mailto:facu785@gmail.com?subject=Quiero%20una%20demo%20de%20MenuSky&body=Hola%2C%20vi%20MenuSky%20y%20quiero%20pedir%20una%20demo.%0D%0A%0D%0ANombre%3A%0D%0ALocal%20(restaurante%2C%20bar%20o%20caf%C3%A9)%3A%0D%0ACiudad%3A%0D%0ATel%C3%A9fono%3A%0D%0A";

export const PHONE_DISPLAY = "+54 9 362 410-5311";
export const EMAIL_DISPLAY = "facu785@gmail.com";

/** Atributos obligatorios para los enlaces a WhatsApp (CA-2.4, RNF-S2). */
export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
