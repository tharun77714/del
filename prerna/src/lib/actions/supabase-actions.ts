"use server";

import { createClient } from '@supabase/supabase-js';
import type { Profile } from '@/contexts/AuthContext'; // Re-use profile type definition
import supabase from '@/lib/supabaseClient'; // This is the client-side/anon key client for auth operations
import { createSupabaseServerActionClient } from '@/lib/supabase/server'; // For RLS respecting actions

const supabaseAppUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseAppUrl) {
  const errorMessage = "FATAL ERROR: NEXT_PUBLIC_SUPABASE_URL is not set in environment variables. This is required to connect to Supabase.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

if (!supabaseServiceKey) {
  const errorMessage = "FATAL ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. This key is required for admin operations on Supabase. Please ensure it's in your .env file and the server has been restarted.";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Admin client - use with caution, bypasses RLS.
const supabaseAdmin = createClient(supabaseAppUrl, supabaseServiceKey);


// --- Business Sign Up ---
interface BusinessSignUpData {
  businessName: string;
  email: string;
  password: string;
  gstNumber: string;
  businessType: string;
  businessAddressText: string;
  businessAddressLat?: number;
  businessAddressLng?: number;
  contactPersonName: string;
  contactPhoneNumber: string;
}

export async function signUpBusiness(data: BusinessSignUpData) {
  const { email, password, ...profileDetails } = data;
  const supabaseClient = await createSupabaseServerActionClient(); // Await the client creation

  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'business', // Role is passed to trigger
      }
    }
  });

  if (authError) {
    return { data: null, error: authError };
  }
  if (!authData.user) {
    return { data: null, error: { message: 'User not created after sign up.', name: 'UserCreationError' } };
  }

  // Trigger handle_new_user creates basic profile. Now update it with full details.
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({
      business_name: profileDetails.businessName,
      gst_number: profileDetails.gstNumber,
      business_type: profileDetails.businessType,
      business_address_text: profileDetails.businessAddressText,
      business_address_lat: profileDetails.businessAddressLat,
      business_address_lng: profileDetails.businessAddressLng,
      contact_person_name: profileDetails.contactPersonName,
      contact_phone_number: profileDetails.contactPhoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id);

  if (profileUpdateError) {
    // Optional: attempt to delete the auth user if profile update fails to keep things clean
    // await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error("Error updating business profile after signup:", profileUpdateError);
    return { data: null, error: { message: `User signed up, but profile update failed: ${profileUpdateError.message}`, name: 'ProfileUpdateError' } };
  }

  return { data: authData, error: null };
}


// --- Individual Sign Up ---
interface IndividualSignUpData {
  fullName: string;
  email?: string;
  password?:string;
  phoneNumber?: string;
  otp?: string;
  defaultShippingAddressText: string;
  defaultShippingAddressLat?: number;
  defaultShippingAddressLng?: number;
  profilePhoneNumber?: string;
}

export async function signUpIndividual(data: IndividualSignUpData) {
  const { email, password, phoneNumber, otp, profilePhoneNumber, ...profileDetails } = data;

  console.log("signUpIndividual received data:", { email, password, phoneNumber, otp, profilePhoneNumber, profileDetails });

  let authData = null;
  let authError = null;

  if (phoneNumber && otp) {
    // Verify OTP for phone signup/signin
    console.log("Calling supabase.auth.verifyOtp with phone:", phoneNumber);
    const result = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    });
    authData = result.data;
    authError = result.error;
  } else if (phoneNumber) {
    // Send OTP for phone signup/signin
    console.log("Calling supabase.auth.signInWithOtp with phone:", phoneNumber);
    const result = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        data: {
          role: 'individual',
        },
      },
    });
    authData = result.data;
    authError = result.error;
  } else if (email && password) {
    // Email/password signup
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          role: 'individual', // Role is passed to trigger
        }
      }
    });
    authData = result.data;
    authError = result.error;
  } else {
    return { data: null, error: { message: 'Invalid authentication method provided.', name: 'InvalidAuthMethodError' } };
  }

  if (authError) {
    console.error("Supabase Auth Error in signUpIndividual:", authError);
    return { data: null, error: authError };
  }
  if (!authData?.user) {
    // For OTP flow, user might not be immediately available after first step (sending OTP)
    if (phoneNumber && !otp) {
      return { data: authData, error: null }; // Indicate OTP sent, no user yet
    }
    return { data: null, error: { message: 'User not created or verified.', name: 'UserCreationError' } };
  }

  // Trigger handle_new_user creates basic profile. Now update it with full details.
  const { error: profileUpdateError } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: profileDetails.fullName,
      default_shipping_address_text: profileDetails.defaultShippingAddressText,
      default_shipping_address_lat: profileDetails.defaultShippingAddressLat,
      default_shipping_address_lng: profileDetails.defaultShippingAddressLng,
      individual_phone_number: profilePhoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id);
  
  if (profileUpdateError) {
    console.error("Supabase Profile Update Error in signUpIndividual:", profileUpdateError);
    return { data: null, error: { message: `User signed up, but profile update failed: ${profileUpdateError.message}`, name: 'ProfileUpdateError' } };
  }

  return { data: authData, error: null };
}


// --- Get Profile (Generic, used by AuthContext or for store details) ---
export async function getProfile(userId: string): Promise<{ data: Profile | null; error: any }> {
  const supabaseClient = await createSupabaseServerActionClient(); // Use server client for RLS
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data: data as Profile | null, error };
}

// --- Get All Registered Businesses (for Individual Network View) ---
export async function getRegisteredBusinesses(): Promise<{ data: Profile[] | null; error: any }> {
  const supabaseClient = await createSupabaseServerActionClient(); // Use server client for RLS
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('role', 'business');
  
  return { data: data as Profile[] | null, error };
}


// --- Update Business Profile ---
type BusinessProfileUpdateData = Partial<Omit<Profile, 'id' | 'email' | 'role' | 
                                      'full_name' | 'default_shipping_address_text' | 
                                      'default_shipping_address_lat' | 'default_shipping_address_lng' | 
                                      'individual_phone_number'>>;


export async function updateBusinessProfile(userId: string, updates: BusinessProfileUpdateData) {
   const supabaseClient = await createSupabaseServerActionClient();
   const updatePayload: { [key: string]: any } = {};
   
    if (updates.business_name !== undefined) updatePayload.business_name = updates.business_name;
    if (updates.gst_number !== undefined) updatePayload.gst_number = updates.gst_number;
    if (updates.business_type !== undefined) updatePayload.business_type = updates.business_type;
    if (updates.business_address_text !== undefined) updatePayload.business_address_text = updates.business_address_text;
    
    // Explicit handling for lat/lng to ensure they are numbers or null
    if (updates.business_address_lat !== undefined) {
        const latVal = updates.business_address_lat === null ? null : parseFloat(String(updates.business_address_lat));
        updatePayload.business_address_lat = isNaN(latVal as number) ? null : latVal;
    }
    if (updates.business_address_lng !== undefined) {
        const lngVal = updates.business_address_lng === null ? null : parseFloat(String(updates.business_address_lng));
        updatePayload.business_address_lng = isNaN(lngVal as number) ? null : lngVal;
    }

    if (updates.contact_person_name !== undefined) updatePayload.contact_person_name = updates.contact_person_name;
    if (updates.contact_phone_number !== undefined) updatePayload.contact_phone_number = updates.contact_phone_number;
    
    if (Object.keys(updatePayload).length > 0) { // Only set updated_at if there are other changes
        updatePayload.updated_at = new Date().toISOString();
    } else {
        // No actual changes to update other than potentially updated_at, so maybe return early or don't update.
        // For now, if only updated_at would change, we proceed, but this could be optimized.
        if (Object.keys(updates).length > 0) { // If there were input updates but none made it to payload (e.g. all undefined or only lat/lng becoming NaN then null)
            updatePayload.updated_at = new Date().toISOString(); // Still ensure updated_at is set if there was an attempt to change.
        }
    }


  const { data, error } = await supabaseClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}

// --- Update Individual Profile ---
type IndividualProfileUpdateData = Partial<Omit<Profile, 'id' | 'email' | 'role' |
                                        'business_name' | 'gst_number' | 'business_type' | 
                                        'business_address_text' | 'business_address_lat' | 
                                        'business_address_lng' | 'contact_person_name' | 
                                        'contact_phone_number'>>;

export async function updateIndividualProfile(userId: string, updates: IndividualProfileUpdateData) {
  const supabaseClient = await createSupabaseServerActionClient();
  const updatePayload: { [key: string]: any } = {};
  if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
  if (updates.default_shipping_address_text !== undefined) updatePayload.default_shipping_address_text = updates.default_shipping_address_text;
  
  // Explicit handling for lat/lng
  if (updates.default_shipping_address_lat !== undefined) {
    const latVal = updates.default_shipping_address_lat === null ? null : parseFloat(String(updates.default_shipping_address_lat));
    updatePayload.default_shipping_address_lat = isNaN(latVal as number) ? null : latVal;
  }
  if (updates.default_shipping_address_lng !== undefined) {
    const lngVal = updates.default_shipping_address_lng === null ? null : parseFloat(String(updates.default_shipping_address_lng));
    updatePayload.default_shipping_address_lng = isNaN(lngVal as number) ? null : lngVal;
  }

  if (updates.individual_phone_number !== undefined) updatePayload.individual_phone_number = updates.individual_phone_number;

  if (Object.keys(updatePayload).length > 0) {
    updatePayload.updated_at = new Date().toISOString();
  } else {
     if (Object.keys(updates).length > 0) {
        updatePayload.updated_at = new Date().toISOString();
     }
  }
  

  const { data, error } = await supabaseClient
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}


// --- Add Jewelry Item ---
export interface JewelryItemData {
  name: string;
  description: string;
  material: string;
  style: string;
  image_url: string; 
}

export async function addJewelryItem(itemData: Omit<JewelryItemData, 'business_id'>) {
  const supabaseClient = await createSupabaseServerActionClient();
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError || !session?.user) {
    return { data: null, error: { message: "User not authenticated for jewelry item insertion.", name: "AuthenticationError" } };
  }

  const { data, error } = await supabaseClient
    .from('jewelry_items')
    .insert([{ ...itemData, business_id: session.user.id }])
    .select();

  return { data, error };
}

// --- Get Jewelry Items for a Business ---
export async function getJewelryItemsByBusiness(businessId: string) {
  const supabaseClient = await createSupabaseServerActionClient();
  const { data, error } = await supabaseClient
    .from('jewelry_items')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  return { data: data as JewelryItemData[] | null, error };
}

// --- Save Design ---
interface SaveDesignData {
  user_id: string;
  image_data_uri: string;
  design_prompt: string;
}
export interface SavedDesign {
  id: string;
  user_id: string;
  image_data_uri: string;
  design_prompt: string;
  created_at: string;
}


export async function saveDesignAction(designData: SaveDesignData): Promise<{ data: SavedDesign | null; error: Error | null }> {
  const supabaseClient = await createSupabaseServerActionClient();

  if (!designData.user_id || !designData.image_data_uri || !designData.design_prompt) {
    return { data: null, error: new Error("User ID, image data URI, and design prompt are required.") };
  }

  const { data: insertedDataArray, error: supabaseError } = await supabaseClient
    .from('saved_designs')
    .insert([
      {
        user_id: designData.user_id,
        image_data_uri: designData.image_data_uri,
        design_prompt: designData.design_prompt,
      },
    ])
    .select(); // Use .select() which returns an array

  if (supabaseError) {
    console.error("Supabase error saving design (server-side):", supabaseError);
    return { data: null, error: new Error(supabaseError.message || "Failed to save design due to a database error.") };
  }

  if (!insertedDataArray || insertedDataArray.length === 0) {
    console.error("Supabase insert into saved_designs did not return data or returned an empty array.");
    return { data: null, error: new Error("Failed to save design: No confirmation data received from database.") };
  }

  return { data: insertedDataArray[0] as SavedDesign, error: null };
}

// --- Get Saved Designs by User ID ---
export async function getSavedDesignsByUserIdAction(userId: string): Promise<{ data: SavedDesign[] | null; error: Error | null }> {
  const supabaseClient = await createSupabaseServerActionClient();

  if (!userId) {
    return { data: null, error: new Error("User ID is required to fetch saved designs.") };
  }

  const { data, error: supabaseError } = await supabaseClient
    .from('saved_designs')
    .select('id, user_id, image_data_uri, design_prompt, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (supabaseError) {
    console.error("Supabase error fetching saved designs:", supabaseError);
    return { data: null, error: new Error(supabaseError.message || "Failed to fetch saved designs.") };
  }

  return { data: data as SavedDesign[], error: null };
}

export interface UserReviewWithStore {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  store_id: string;
  user_id: string;
  store: { // Joined store data
    id: string;
    name: string;
  };
}

export async function getUserReviewsWithStoreInfo(userId: string): Promise<{ data: UserReviewWithStore[] | null; error: Error | null }> {
  const supabaseClient = await createSupabaseServerActionClient();
  const { data, error } = await supabaseClient
    .from('store_reviews')
    .select(`
      *,
      store:stores(id, name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching user reviews with store info:", error);
    return { data: null, error: new Error(error.message) };
  }

  // Filter out reviews where store data might be null due to RLS or missing store entry
  const filteredData = data?.filter(review => review.store !== null) as UserReviewWithStore[] || [];
  
  return { data: filteredData, error: null };
}

    