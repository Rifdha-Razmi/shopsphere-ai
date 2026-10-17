import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { CustomerStep } from "@/features/checkout/components/customer-step";
import { AddressForm, EMPTY_ADDRESS } from "@/features/checkout/components/address-form";
import { useAuthStore } from "@/store/auth.store";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { renderWithProviders } from "../helpers/render";

describe("LoginForm", () => {
  it("validates required fields with accessible errors", async () => {
    renderWithProviders(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    const id = screen.getByLabelText(/email or username/i);
    expect(id).toHaveAttribute("aria-invalid", "true");
    expect(id).toHaveAccessibleDescription(/enter your email or username/i);
  });

  it("shows which field failed for a wrong password, then signs in", async () => {
    useAuthStore.setState({ session: null, users: [] });
    renderWithProviders(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email or username/i), DEMO_ACCOUNTS.customer.email);
    await userEvent.type(screen.getByLabelText(/^password/i), "nope");
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/password is incorrect/i)).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/^password/i));
    await userEvent.type(screen.getByLabelText(/^password/i), DEMO_ACCOUNTS.customer.password);
    await userEvent.click(screen.getByRole("button", { name: /^sign in$/i }));
    await vi.waitFor(() => expect(useAuthStore.getState().session?.user.email).toBe(DEMO_ACCOUNTS.customer.email));
  });
});

describe("RegisterForm", () => {
  it("enforces password rules, matching confirmation and terms", async () => {
    renderWithProviders(<RegisterForm />);
    await userEvent.type(screen.getByLabelText(/^password/i), "short");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "different");
    await userEvent.type(screen.getByLabelText(/mobile number/i), "12345");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    expect(screen.getByText(/valid 10-digit mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/accept the terms/i)).toBeInTheDocument();
  });
});

describe("ReviewForm", () => {
  it("requires a rating and a minimum length, then submits", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<ReviewForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /submit review/i }));
    expect(await screen.findByText(/select a star rating/i)).toBeInTheDocument();
    expect(screen.getByText(/reviews need at least 3 characters/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    await userEvent.type(screen.getByLabelText(/headline/i), "Great value");
    await userEvent.type(screen.getByLabelText(/your review/i), "Works really well and arrived quickly.");
    await userEvent.click(screen.getByRole("button", { name: /submit review/i }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 4, title: "Great value" })));
  });
});

describe("Checkout steps", () => {
  it("customer step validates email and phone", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<CustomerStep defaultValues={{ fullName: "A B", email: "bad", phone: "1" }} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /continue to address/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("address form validates pincode and reports drafts", async () => {
    const onChange = vi.fn();
    renderWithProviders(<AddressForm defaultValues={EMPTY_ADDRESS} onSubmit={vi.fn()} onChange={onChange} submitLabel="Continue" />);
    await userEvent.type(screen.getByLabelText(/pincode/i), "12");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/valid 6-digit pincode/i)).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ pincode: "12" }));
  });
});
