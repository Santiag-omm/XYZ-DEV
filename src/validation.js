import { z } from "zod";

const nameRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'. -]+$/u;
const phoneRegex = /^[0-9]{10}$/;

export const passwordPolicyText =
  "Usa mas de 8 caracteres con mayuscula, minuscula, numero y simbolo.";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre no puede pasar de 80 caracteres.")
    .regex(nameRegex, "El nombre solo puede contener letras, espacios y puntuacion comun."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo invalido.")
    .max(120, "El correo no puede pasar de 120 caracteres."),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "El telefono debe tener exactamente 10 digitos."),
  address: z
    .string()
    .trim()
    .min(8, "La direccion debe tener al menos 8 caracteres.")
    .max(180, "La direccion no puede pasar de 180 caracteres."),
  password: z
    .string()
    .min(9, passwordPolicyText)
    .max(72, "La contrasena no puede pasar de 72 caracteres.")
    .regex(/[a-z]/, passwordPolicyText)
    .regex(/[A-Z]/, passwordPolicyText)
    .regex(/[0-9]/, passwordPolicyText)
    .regex(/[^A-Za-z0-9\s]/, passwordPolicyText),
  captchaAnswer: z.string().trim().min(1, "Resuelve el reto CAPTCHA.")
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo invalido.")
    .max(120, "El correo no puede pasar de 120 caracteres."),
  password: z.string().min(1, "Escribe tu contrasena.").max(72),
  captchaAnswer: z.string().trim().min(1, "Resuelve el reto CAPTCHA.")
});

export function validate(schema, payload) {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { ok: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => ({
    field: issue.path[0],
    message: issue.message
  }));

  return { ok: false, errors };
}
