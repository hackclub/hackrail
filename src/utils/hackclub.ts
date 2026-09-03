import { db } from "../db/index";
import { users, type User } from "../db/schema";
import { type Result } from "../shared/types";
import { GenerateToken, GetUserProfileBySlackId } from "./auth";

// Login takes a hackclub oauth code & returns a hackrail token
async function Login(code: string): Promise<Result<string>> {
  try {
    const response = await fetch("https://auth.hackclub.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: import.meta.env.PUBLIC_CLIENT_ID,
        client_secret: import.meta.env.CLIENT_SECRET,
        redirect_uri: import.meta.env.PUBLIC_REDIRECT_URI,
        code: code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        error: new Error(
          `dang it we got a http error. status: ${response.status}, message: ${errorText}`,
        ),
      };
    }

    const data = await response.json();
    const token = data.access_token;

    if (!token) {
      return { ok: false, error: new Error("gng we don't have a token what") };
    }

    // now that we have a token, we can use it to get the user's profile

    const profileResponse = await fetch("https://auth.hackclub.com/api/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      return {
        ok: false,
        error: new Error(
          `dang it we got a http error when fetching profile. status: ${profileResponse.status}, message: ${errorText}`,
        ),
      };
    }

    const profileData = await profileResponse.json();

    // check if the user alr exists
    const dbUserProfile = await GetUserProfileBySlackId(
      profileData.identity.slack_id,
    );

    const primaryAdress = profileData.identity.addresses.find(
      (address: any) => address.primary,
    );

    if (!dbUserProfile.ok) {
      // the user doesn't have a profile yet
      const profile: User = {
        slackId: profileData.identity.slack_id,
        firstName: profileData.identity.first_name,
        lastName: profileData.identity.last_name,
        email: profileData.identity.primary_email,
        addressLine1: primaryAdress?.line_1 || "",
        addressLine2: primaryAdress?.line_2 || "",
        city: primaryAdress?.city || "",
        state: primaryAdress?.state || "",
        zipCode: primaryAdress?.postal_code || "",
        country: primaryAdress?.country || "",
        birthdate: profileData.identity.birthday,
        avatar:
          "https://cachet.dunkirk.sh/users/" +
          profileData.identity.slack_id +
          "/r",
        banned: 0,
        note: "",
        hackatimeLinked: 0,
        hackatimeToken: "",
        createdAt: new Date(),
      };

      // now we can use the profile to get a hackrail token
      await upsertUser(profile);
    }

    const hackrailtoken = await GenerateToken(profileData.identity.slack_id);

    return { ok: true, value: hackrailtoken };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

export async function upsertUser(profile: User) {
  const [row] = await db
    .insert(users)
    .values(profile)
    .onConflictDoUpdate({
      target: users.slackId,
      set: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        addressLine1: profile.addressLine1,
        addressLine2: profile.addressLine2,
        city: profile.city,
        state: profile.state,
        zipCode: profile.zipCode,
        country: profile.country,
        birthdate: profile.birthdate,
        avatar: profile.avatar,
        banned: profile.banned,
        note: profile.note,
        hackatimeLinked: profile.hackatimeLinked,
        hackatimeToken: profile.hackatimeToken,
      },
    })
    .returning();

  return row;
}

export { Login };
