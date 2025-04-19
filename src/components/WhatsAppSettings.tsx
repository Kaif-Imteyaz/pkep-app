import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Save, Loader2, CheckCircle, XCircle, AlertCircle, Send, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendWhatsAppTemplate,sendWhatsAppTextMessage } from '../lib/whatsappMessage';
import {Toaster, toast} from 'react-hot-toast';



interface Profile {
  id: string;
  phone: string | null;
  email: string;
  full_name: string;
  whatsapp_opted_in?: boolean;
  whatsapp_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppMessage {
  id: string;
  message_id: string;
  user_id: string;
  phone_number: string;
  direction: 'incoming' | 'outgoing';
  content: any;
  type: string;
  status: string | null;
  status_updated_at: string | null;
  created_at: string;
}

export function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [recentMessages, setRecentMessages] = useState<WhatsAppMessage[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verificationStatus, setVerificationStatus] = useState<'unverified' | 'pending' | 'verified'>('unverified');
  const [tableError, setTableError] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Check if the user is authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Authentication error:', error);
          setAuthError(error.message);
          setLoading(false);
          return;
        }
        
        if (!data.session) {
          console.warn('No active session');
          setAuthError('Please log in to access this page');
          setLoading(false);
          return;
        }
        
        // Session exists, proceed to fetch profile
        await fetchProfile();
      } catch (err) {
        console.error('Error checking authentication:', err);
        setAuthError('Authentication check failed');
        setLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // Function to create the profiles table if it doesn't exist
  const initializeProfilesTable = async () => {
    try {
      // Get the current authenticated user
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      if (!session || !session.user) throw new Error("No authenticated user found");
      
      const user = session.user;
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id);
      
      // If profile already exists, no need to create
      if (existingProfile && existingProfile.length > 0) {
        return true;
      }
      
      try {
        // Try creating the profile with RPC function
        const { error: createTableError } = await supabase.rpc('create_profiles_table_if_not_exists');
        
        if (createTableError && createTableError.code !== '42883') { // Ignore if function doesn't exist
          console.error('Error creating profiles table:', createTableError);
        }
      } catch (err) {
        // RPC function might not exist, which is fine
        console.log('RPC function not available, will create profile directly');
      }
      
      // Create basic profile entry directly
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        phone: null,
        whatsapp_opted_in: false,
        whatsapp_verified: false,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // If error is not due to duplicate or table not existing, throw it
      if (insertError && insertError.code !== '23505' && insertError.code !== '42P01') {
        throw insertError;
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing profiles table:', error);
      return false;
    }
  };
  

  // Fetch the user profile and WhatsApp settings
  async function fetchProfile() {
    try {
      setLoading(true);
      setProfileError(null);
      
      // Get the current authenticated user
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        setProfileError(authError.message);
        setAuthError(authError.message);
        return;
      }
      
      if (!session || !session.user) {
        setAuthError('Not authenticated. Please log in again.');
        return;
      }
      
      const user = session.user;
      
      // First check if the profile exists
      const { data: profileCheck, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id);
      
      // If no profile exists or there's a table error, initialize it
      if (!profileCheck || profileCheck.length === 0 || checkError) {
        await initializeProfilesTable();
      }
      
      // Use the supabase client to fetch profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);
      
      if (error) {
        console.error('Error fetching profile:', error);
        if (error.code === '42P01') { // Table doesn't exist error
          setTableError(true);
          // Try to initialize the table
          await initializeProfilesTable();
          
          // Retry fetching the profile after table creation
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id);
          
          if (retryError) {
            setProfileError(`Profile could not be retrieved: ${retryError.message}`);
            return;
          }
          
          if (retryData && retryData.length > 0) {
            const userProfile = retryData[0];
            setProfile(userProfile);
            setPhone(userProfile.phone || '');
            setOptedIn(!!userProfile.whatsapp_opted_in);
            updateVerificationStatus(userProfile);
          } else {
            setProfileError('Could not find profile after initialization');
          }
        } else {
          setProfileError(`Error loading profile: ${error.message}`);
          return;
        }
      } else if (data && data.length > 0) {
        const userProfile = data[0];
        setProfile(userProfile);
        setPhone(userProfile.phone || '');
        setOptedIn(!!userProfile.whatsapp_opted_in);
        updateVerificationStatus(userProfile);
      } else {
        console.log('No profile found, will create one on save');
        
        // Create a basic profile
        const newProfile: Profile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          phone: null
        };
        
        setProfile(newProfile);
        setOptedIn(false);
        setVerificationStatus('unverified');
      }
      
      try {
        // Use the supabase client for fetching whatsapp messages
        const { data: messages, error: messagesError } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (messagesError) {
          // Only log if not a "table doesn't exist" error
          if (!messagesError.message.includes('does not exist')) {
            console.error('Error fetching recent messages:', messagesError);
          }
        } else if (messages && messages.length > 0) {
          setRecentMessages(messages);
        }
      } catch (err: unknown) {
        const error = err as Error;
        // Only log if not a "table doesn't exist" error
        if (!error.message?.includes('does not exist')) {
          console.error('Error fetching WhatsApp messages:', error);
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error in fetchProfile:', error);
      setProfileError(error.message);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to update verification status
  function updateVerificationStatus(profileData: Profile & { whatsapp_verified?: boolean }) {
    if (profileData.phone && profileData.whatsapp_verified) {
      setVerificationStatus('verified');
    } else if (profileData.phone) {
      setVerificationStatus('pending');
    } else {
      setVerificationStatus('unverified');
    }
  }

  // Handle saving changes to phone number and opt-in status
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveStatus('idle');
      
      // Get the current authenticated user
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Authentication error: ' + authError.message);
      }
      
      if (!session || !session.user) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      const user = session.user;
      
      // If tableError is true, we need to create the table first
      if (tableError) {
        const initialized = await initializeProfilesTable();
        if (!initialized) {
          throw new Error("Could not initialize profiles table");
        }
        setTableError(false);
      }
      
      // Format the phone number (remove spaces, add + if missing)
      const formattedPhone = phone.trim().replace(/\s+/g, '');
      const phoneWithPlus = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      
      // Prepare the update data
      const updateData = { 
        phone: phoneWithPlus,
        whatsapp_opted_in: optedIn,
        whatsapp_verified: verificationStatus === 'verified',
        updated_at: new Date()
      };
      
      // If this is a new profile, add additional required fields
      if (!profile) {
        Object.assign(updateData, {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          created_at: new Date()
        });
      }
      
      // Always use upsert to be safe
      const result = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updateData
        });
        
      if (result.error) {
        if (result.error.code === '42P01') {
          // If table doesn't exist, try to create it and retry
          const initialized = await initializeProfilesTable();
          if (initialized) {
            // Retry the operation
            const retryResult = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                ...updateData
              });
              
            if (retryResult.error) throw retryResult.error;
          } else {
            throw new Error("Could not initialize profiles table");
          }
        } else {
          throw result.error;
        }
      }
      
      // Show success message
      setSaveStatus('success');
      
      // If the phone number changed and the user opted in, set verification status to pending
      if (optedIn && phoneWithPlus !== profile?.phone) {
        setVerificationStatus('pending');
        
        try {
          // Trigger verification message
          const { error } = await supabase.functions.invoke('send-verification', {
            body: { phone: phoneWithPlus }
          });
          
          if (error) {
            console.warn('Error sending verification message:', error);
            // Don't fail the whole save process if just the verification message fails
          } else {
            console.log('Verification message sent successfully');
          }
        } catch (error) {
          console.warn('Could not send verification message:', error);
          // Don't fail the whole save process if just the verification message fails
        }
      }
      
      // Refresh profile data
      await fetchProfile();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      if (error instanceof Error) {
        setProfileError(error.message);
      }
    } finally {
      setSaving(false);
      // Reset save status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Function to send a feedback template without requiring profile setup
  const sendFeedbackTemplate = async () => {
    try {
      setSendingFeedback(true);
      setFeedbackStatus('idle');
      setProfileError(null);
      
      // Format the phone number (remove spaces, add + if missing)
      const formattedPhone = recipientPhone.trim().replace(/\s+/g, '');
      const phoneWithPlus = formattedPhone.startsWith('+') ? formattedPhone : `+${formattedPhone}`;
      
      if (!phoneWithPlus) {
        throw new Error('Please enter a valid phone number');
      }

      // Call the feedback survey edge function
      const { error } = await supabase.functions.invoke('send-feedback-survey', {
        body: { 
          phone: phoneWithPlus,
          businessName: "Jasper's Market",
          location: "your local store",
          visitDate: "today",
          surveyLink: "https://example.com/feedback"
        },
      });
      
      if (error) {
        console.error('Error sending feedback template:', error);
        throw error;
      }
      
      console.log('Feedback template sent successfully');
      setFeedbackStatus('success');
      
    } catch (error) {
      console.error('Error sending feedback template:', error);
      setFeedbackStatus('error');
      if (error instanceof Error) {
        setProfileError(error.message);
      }
    } finally {
      setSendingFeedback(false);
      // Reset feedback status after 3 seconds
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };


  // If there's an auth error, show a login prompt
  if (authError) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-red-500" />
              Authentication Error
            </h3>
          </div>
          <div className="px-4 py-5 sm:p-6 text-center">
            <p className="text-red-600 mb-4">{authError}</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function exampleUsage() {
  const phoneNumberId =  '637393796117589';
  const accessToken = localStorage.getItem('accessToken') ?? '';
  const recipientNumber = phone;

  console.log(phone);
  try {
    const templateResponse = await sendWhatsAppTemplate(
      phoneNumberId,
      accessToken,
      recipientNumber,
      'hello_world'
    );
    console.log('Template Response:', templateResponse);
    toast.success('Message Sent')

    // const textResponse = await sendWhatsAppTextMessage(
    //   phoneNumberId,
    //   accessToken,
    //   recipientNumber,
    //   'Hello from the function!'
    // );
    // console.log('Text Response:', textResponse);
  } catch (error) {
    console.error('Error in example usage:', error);
    toast.error('Message not sent')
  }
}

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-indigo-500" />
            WhatsApp Integration Settings
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage your WhatsApp settings and send messages via WhatsApp.
          </p>
        </div>
        
        {loading ? (
          <div className="px-4 py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-indigo-500" />
            <p className="mt-2 text-gray-500">Loading your settings...</p>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                <p className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {profileError}
                </p>
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="whatsapp-phone" className="block text-sm font-medium text-gray-700">
                  Your WhatsApp Phone Number
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    name="whatsapp-phone"
                    id="whatsapp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="+91xxxxxxxxxx"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Enter your WhatsApp number with country code (e.g., +91 for India)
                </p>
                <div className="mt-6">
                <button
                  type="button"
                  onClick={exampleUsage}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Send
                </button>
                <Toaster
                position='top-center'
                reverseOrder={true}
                />
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="opt-in"
                    name="opt-in"
                    type="checkbox"
                    checked={optedIn}
                    onChange={(e) => setOptedIn(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="opt-in" className="font-medium text-gray-700">
                    Opt-in to WhatsApp communication
                  </label>
                  <p className="text-gray-500">
                    Receive meeting reminders, performance updates, and share knowledge via WhatsApp
                  </p>
                </div>
              </div>
              
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Status:
                </span>
                <div className="flex items-center">
                  {verificationStatus === 'verified' && (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-1" />
                      <span>Verified</span>
                    </div>
                  )}
                  {verificationStatus === 'pending' && (
                    <div className="flex items-center text-yellow-600">
                      <Loader2 className="h-5 w-5 mr-1 animate-spin" />
                      <span>
                        Pending Verification - Please reply to the WhatsApp message you received to complete verification
                      </span>
                    </div>
                  )}
                  {verificationStatus === 'unverified' && (
                    <div className="flex items-center text-gray-500">
                      <XCircle className="h-5 w-5 mr-1" />
                      <span>Not Verified</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
                
                {saveStatus === 'success' && (
                  <span className="ml-3 text-green-600 text-sm">Settings saved successfully!</span>
                )}
                
                {saveStatus === 'error' && (
                  <span className="ml-3 text-red-600 text-sm">Error saving settings. Please try again.</span>
                )}
              </div>
            </div>
            
            {/* Recent Messages */}
            {recentMessages.length > 0 && (
              <div className="mt-10">
                <h4 className="text-md font-medium text-gray-900 mb-4">Recent WhatsApp Messages</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Content
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentMessages.map((message: WhatsAppMessage) => (
                        <tr key={message.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {message.direction === 'incoming' ? 'Received' : 'Sent'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {typeof message.content === 'object' && message.content?.text 
                              ? message.content.text 
                              : (
                                <span className="italic text-gray-400">
                                  {message.type} message
                                </span>
                              )
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {message.status || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(message.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Feedback Template Section */}
            <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-md font-medium text-green-900 mb-2">Send Feedback Template</h4>
              <p className="text-sm text-green-800 mb-4">
                Send a feedback survey template to a WhatsApp number directly (no profile setup required).
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="recipient-phone" className="block text-sm font-medium text-gray-700">
                    Recipient WhatsApp Number
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      name="recipient-phone"
                      id="recipient-phone"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="+91xxxxxxxxxx"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter recipient's WhatsApp number with country code
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={sendFeedbackTemplate}
                  disabled={sendingFeedback || !recipientPhone}
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {sendingFeedback ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Sending Feedback Template...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Feedback Template
                    </>
                  )}
                </button>
                
                {feedbackStatus === 'success' && (
                  <div className="mt-2 p-2 bg-green-100 text-green-700 rounded-md text-center">
                    <CheckCircle className="inline-block h-5 w-5 mr-1" />
                    <span>Feedback template sent successfully!</span>
                  </div>
                )}
                
                {feedbackStatus === 'error' && (
                  <div className="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-center">
                    <XCircle className="inline-block h-5 w-5 mr-1" />
                    <span>Error sending feedback template. Please try again.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
 