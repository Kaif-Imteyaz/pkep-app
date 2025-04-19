import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Phone, MessageSquare, Save, Loader2, CheckCircle, XCircle, AlertCircle, Send, Info, Braces } from 'lucide-react';

export function Admin(){

    const [accessToken, setToken] = useState('');

    function storeNewAccessToken() {
        localStorage.setItem('accessToken', accessToken)
        toast.success("New Token Stored")
    }
    return(
        <div className="max-w-3xl mx-auto">
            <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b">
            <div className="space-y-6">
              <div>
                <label htmlFor="to-set-token" className="block text-sm font-medium text-gray-700">
                  Set New Access Token
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    <Braces className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    name="to-set-token"
                    id="to-set-token"
                    onChange={(e) => setToken(e.target.value)}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="mt-6">
                <button
                  type="button"
                  onClick={storeNewAccessToken}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Store New Access Token
                </button>
                <Toaster
                  position="top-center"
                  reverseOrder = {true}
                />
                </div>
              </div>
            </div>
            </div>
            </div>
        </div>
    )
}