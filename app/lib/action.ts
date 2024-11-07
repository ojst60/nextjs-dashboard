"use server";
import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcrypt";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const SignUpFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Must be at least 2 characters long" }),
  password: z.string().min(6, { message: "Min character is 6" }),
  email: z.string().email({ message: "Enter a valid email" }).trim(),
});

export type SignUpFormState =
   { name: string; password: string; email: string }
  | {
      name: string;
      password: string;
      email: string;
      errors?: {
        name?: string[] | undefined;
        email?: string[] | undefined;
        password?: string[] | undefined;
      };
      message?: string;
    }
  | undefined;

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  prevState?: State;
};

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  try {
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    // Could be handle properly
    console.log(error);
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  const amountInCents = amount * 100;

  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;
  } catch (error) {
    console.log(error);
    return {
      message: "Date Error: Failed to update Invoice",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath("/dashboard/invoices");
    return { message: "Deleted Invoice." };
  } catch (error) {
    console.log(error);
    return { message: "Database Error: Failed to Delete Invoice." };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function register(
  prevState: SignUpFormState,
  formData: FormData
): Promise<SignUpFormState> {
  console.log({ prevState });
  const validatedFields = SignUpFormSchema.safeParse({
    password: formData.get("password"),
    email: formData.get("email"),
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, password, email } = validatedFields.data;

  try {
    const hashPassword = await bcrypt.hash(password, 10);

    const user = await sql<{
      name: string;
      password: string;
      email: string;
    }>`INSERT INTO USERS (name, email, password) VALUES(${name}, ${email.toLowerCase()}, ${hashPassword})`;

    return user.rows[0];
  } catch (error) {
    console.log(error)
    return { message: "Failed to update",  name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string, };
  }
}
