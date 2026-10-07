import type { User } from "../db/schema";

export function GetShipBlockers(user: User): string[] {
  const blockers: string[] = [];

  if (!user.verificationStatus) {
    blockers.push(
      "We haven't checked your identity verification yet (db updates)",
    );
  } else if (user.verificationStatus === "pending") {
    blockers.push("Your identity verification is still being reviewed.");
  } else if (user.verificationStatus !== "verified") {
    blockers.push("Your identity isn't verified.");
  } else if (!user.yswsEligible) {
    blockers.push(
      "Your Hack Club account isn't eligible for YSWS programs (you need to be 13 to 18).",
    );
  }

  const missingProfile = [
    !user.firstName.trim() && "first name",
    !user.lastName.trim() && "last name",
    !user.email.trim() && "email",
    !user.birthdate?.trim() && "birthday",
  ].filter(Boolean);
  if (missingProfile.length) {
    blockers.push(
      `Your ${missingProfile.join(", ")} ${missingProfile.length > 1 ? "are" : "is"} missing.`,
    );
  }

  const missingAddress = [
    !user.addressLine1.trim() && "street address",
    !user.city.trim() && "city",
    !user.zipCode.trim() && "ZIP / postal code",
    !user.country.trim() && "country",
  ].filter(Boolean);
  if (missingAddress.length === 4) {
    blockers.push("You don't have a primary address.");
  } else if (missingAddress.length) {
    blockers.push(
      `Your primary address is missing its ${missingAddress.join(", ")}.`,
    );
  }

  return blockers;
}
