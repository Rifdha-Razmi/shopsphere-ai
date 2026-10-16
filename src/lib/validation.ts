import { z } from "zod";
import { REVIEW_MAX_CHARS, REVIEW_MIN_CHARS } from "./constants";

/** Form validation schemas (PRD §13: input validation on every form). */

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(50, `${label} must be 50 characters or fewer.`)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, `${label} can only contain letters, spaces, apostrophes and hyphens.`);

export const emailSchema = z.string().trim().min(1, "Email is required.").email("Enter a valid email address, like name@example.com.");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number starting with 6–9.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(64, "Password must be 64 characters or fewer.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/\d/, "Include at least one number.");

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username.").max(100, "That's too long to be a valid email or username."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: name("First name"),
    lastName: name("Last name"),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    acceptTerms: z.boolean().refine((v) => v, "You need to accept the terms to create an account."),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." });
export type RegisterValues = z.infer<typeof registerSchema>;

export const customerInfoSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  email: emailSchema,
  phone: phoneSchema,
});
export type CustomerInfoValues = z.infer<typeof customerInfoSchema>;

export const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode.");

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Give this address a label, like Home or Work.").max(20, "Keep the label under 20 characters."),
  fullName: z.string().trim().min(2, "Enter the recipient's name.").max(80, "Name is too long."),
  phone: phoneSchema,
  line1: z.string().trim().min(5, "Enter the house number and street.").max(120, "Address line is too long."),
  line2: z.string().trim().max(120, "Address line is too long."),
  city: z.string().trim().min(2, "Enter a city.").max(60, "City is too long."),
  state: z.string().trim().min(2, "Select a state."),
  pincode: pincodeSchema,
});
export type AddressValues = z.infer<typeof addressSchema>;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Select a star rating.").max(5),
  title: z.string().trim().min(3, "Add a short headline (at least 3 characters).").max(80, "Keep the headline under 80 characters."),
  body: z
    .string()
    .trim()
    .min(REVIEW_MIN_CHARS, `Reviews need at least ${REVIEW_MIN_CHARS} characters.`)
    .max(REVIEW_MAX_CHARS, `Reviews can be at most ${REVIEW_MAX_CHARS} characters.`),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

export const profileSchema = z.object({
  firstName: name("First name"),
  lastName: name("Last name"),
  email: emailSchema,
  phone: phoneSchema,
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const adminProductSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120, "Title is too long."),
    brand: z.string().trim().min(1, "Brand is required.").max(60, "Brand is too long."),
    category: z.string().trim().min(1, "Choose a category."),
    description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000, "Description is too long."),
    mrp: z.number({ error: "Enter the list price." }).positive("List price must be greater than 0.").max(10_000_000, "That price looks too high."),
    price: z.number({ error: "Enter the selling price." }).positive("Selling price must be greater than 0."),
    stock: z.number({ error: "Enter stock quantity." }).int("Stock must be a whole number.").min(0, "Stock can't be negative.").max(100000, "That's more stock than we can track."),
  })
  .refine((v) => v.price <= v.mrp, { path: ["price"], message: "Selling price can't be higher than the list price." });
export type AdminProductValues = z.infer<typeof adminProductSchema>;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
