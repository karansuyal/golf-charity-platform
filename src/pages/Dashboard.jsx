import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [charities, setCharities] = useState([])
  const [selectedCharity, setSelectedCharity] = useState('')
  const [newScore, setNewScore] = useState('')
  const [scoreDate, setScoreDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [charityLoading, setCharityLoading] = useState(false)
  const [userWinnings, setUserWinnings] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchUserData()
    fetchUserWinnings()
  }, [])

  const fetchUserData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: scoresData } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false })
        .limit(5)
      setScores(scoresData || [])

      const { data: charitiesData } = await supabase
        .from('charities')
        .select('*')
      setCharities(charitiesData || [])
      
      if (profileData?.selected_charity_id) {
        setSelectedCharity(profileData.selected_charity_id)
      }
    }
    setLoading(false)
  }

  const fetchUserWinnings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('winners')
        .select('*, draws(draw_date, winning_numbers)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setUserWinnings(data || [])
    }
  }

  const handleAddScore = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    
    const scoreValue = parseInt(newScore)
    if (scoreValue < 1 || scoreValue > 45) {
      alert('Score must be between 1 and 45')
      return
    }

    if (!scoreDate) {
      alert('Please select a date')
      return
    }

    const { error } = await supabase
      .from('scores')
      .insert([
        {
          user_id: user.id,
          score_value: scoreValue,
          score_date: scoreDate
        }
      ])

    if (error) {
      alert('Error adding score: ' + error.message)
    } else {
      const { data: allScores } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score_date', { ascending: false })

      if (allScores && allScores.length > 5) {
        const toDelete = allScores.slice(5)
        for (const score of toDelete) {
          await supabase.from('scores').delete().eq('id', score.id)
        }
      }

      setNewScore('')
      setScoreDate('')
      fetchUserData()
      alert('Score added successfully!')
    }
  }

  const handleUpdateCharity = async () => {
    if (!selectedCharity) {
      alert('Please select a charity')
      return
    }
    
    setCharityLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('profiles')
      .update({ selected_charity_id: selectedCharity })
      .eq('id', user.id)
    
    if (error) {
      alert('Error updating charity: ' + error.message)
    } else {
      alert('Charity updated successfully!')
      fetchUserData()
    }
    setCharityLoading(false)
  }

  const uploadProof = async (winnerId, file) => {
    if (!file) {
      alert('Please select a file')
      return
    }

    setUploading(true)
    
    const fileName = `${winnerId}_${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(fileName, file)

    if (uploadError) {
      alert('Upload error: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('winners')
      .update({ proof_image: fileName })
      .eq('id', winnerId)

    if (updateError) {
      alert('Error updating proof: ' + updateError.message)
    } else {
      alert('Proof uploaded successfully! Admin will verify soon.')
      fetchUserWinnings()
    }
    
    setUploading(false)
  }

  const handleDeleteScore = async (scoreId) => {
    if (confirm('Are you sure you want to delete this score?')) {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId)
      
      if (error) {
        alert('Error deleting score: ' + error.message)
      } else {
        fetchUserData()
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading your dashboard...</div>
      </div>
    )
  }

  const selectedCharityName = charities.find(c => c.id === selectedCharity)?.name || 'Not selected'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Subscription Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Subscription Status</h2>
            <div className="mb-4">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                profile?.subscription_status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {profile?.subscription_status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            {profile?.subscription_type && (
              <p className="text-gray-600 mb-2">Plan: <span className="font-medium">{profile.subscription_type}</span></p>
            )}
            <p className="text-gray-600 mb-4">Charity Contribution: <span className="font-medium">{profile?.charity_percentage || 10}%</span></p>
            <button className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Manage Subscription
            </button>
          </div>

          {/* Charity Selection Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Charity</h2>
            <select
              value={selectedCharity}
              onChange={(e) => setSelectedCharity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a charity</option>
              {charities.map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name} {charity.featured ? '⭐' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleUpdateCharity}
              disabled={charityLoading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {charityLoading ? 'Updating...' : 'Update Charity'}
            </button>
            {selectedCharity && (
              <p className="mt-3 text-sm text-green-600">
                Currently supporting: <span className="font-medium">{selectedCharityName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Score Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Score</h2>
            <form onSubmit={handleAddScore} className="flex flex-col sm:flex-row gap-4">
              <input
                type="number"
                placeholder="Score (1-45)"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                min="1"
                max="45"
              />
              <input
                type="date"
                value={scoreDate}
                onChange={(e) => setScoreDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Add Score
              </button>
            </form>
          </div>

          {/* Scores List */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">My Last 5 Scores</h2>
            {scores.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scores added yet. Add your first score above!</p>
            ) : (
              <div className="space-y-3">
                {scores.map((score) => (
                  <div key={score.id} className="flex justify-between items-center border-b border-gray-100 py-3">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-indigo-600">{score.score_value}</span>
                      <span className="text-gray-500">Stableford points</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">
                        {new Date(score.score_date).toLocaleDateString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleDeleteScore(score.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Winnings Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">🏆 My Winnings</h2>
            {userWinnings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No winnings yet. Keep playing and good luck!</p>
            ) : (
              <div className="space-y-4">
                {userWinnings.map((win) => (
                  <div key={win.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-2xl text-green-600">₹{win.prize_amount?.toLocaleString()}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        win.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {win.payment_status === 'paid' ? 'Paid ✓' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Draw Date: {win.draws?.draw_date ? new Date(win.draws.draw_date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Numbers Matched: {win.match_count} out of 5
                    </p>
                    {win.payment_status !== 'paid' && !win.proof_image && (
                      <div className="mt-3">
                        <label className="block text-sm text-gray-600 mb-1">Upload Score Screenshot (Proof):</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => uploadProof(win.id, e.target.files[0])}
                          disabled={uploading}
                          className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                      </div>
                    )}
                    {win.proof_image && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        ✓ Proof uploaded. Admin will verify soon.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}