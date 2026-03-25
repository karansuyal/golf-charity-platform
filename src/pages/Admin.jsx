import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [charities, setCharities] = useState([])
  const [draws, setDraws] = useState([])
  const [winners, setWinners] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [editingScore, setEditingScore] = useState(null)
  const [editingCharity, setEditingCharity] = useState(null)
  
  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalScores: 0,
    totalPrizePool: 0,
    totalDonated: 0,
    totalDraws: 0
  })

  // Draw form states
  const [drawNumbers, setDrawNumbers] = useState(['', '', '', '', ''])
  const [drawType, setDrawType] = useState('random')
  const [drawDate, setDrawDate] = useState('')
  const [simulationResult, setSimulationResult] = useState(null)

  // Charity form states
  const [newCharity, setNewCharity] = useState({
    name: '',
    description: '',
    image_url: '',
    featured: false
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(usersData || [])

    // Fetch charities
    const { data: charitiesData } = await supabase
      .from('charities')
      .select('*')
      .order('featured', { ascending: false })
    setCharities(charitiesData || [])

    // Fetch draws
    const { data: drawsData } = await supabase
      .from('draws')
      .select('*')
      .order('draw_date', { ascending: false })
    setDraws(drawsData || [])

    // Fetch winners with user names
    const { data: winnersData } = await supabase
      .from('winners')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    setWinners(winnersData || [])

    // Fetch all scores
    const { data: scoresData } = await supabase
      .from('scores')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    setScores(scoresData || [])

    // Calculate stats
    const activeUsers = usersData?.filter(u => u.subscription_status === 'active').length || 0
    const totalPrize = winnersData?.reduce((sum, w) => sum + (w.prize_amount || 0), 0) || 0
    
    setStats({
      totalUsers: usersData?.length || 0,
      activeSubscriptions: activeUsers,
      totalScores: scoresData?.length || 0,
      totalPrizePool: totalPrize,
      totalDonated: 0,
      totalDraws: drawsData?.length || 0
    })

    setLoading(false)
  }

  // ==================== USER MANAGEMENT ====================
  const updateUserSubscription = async (userId, status) => {
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', userId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`User subscription ${status === 'active' ? 'activated' : 'deactivated'}!`)
      fetchAllData()
    }
  }

  const updateUserCharity = async (userId, charityId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ selected_charity_id: charityId })
      .eq('id', userId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('User charity updated!')
      fetchAllData()
    }
  }

  const updateUserPercentage = async (userId, percentage) => {
    const { error } = await supabase
      .from('profiles')
      .update({ charity_percentage: percentage })
      .eq('id', userId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Charity percentage updated!')
      fetchAllData()
    }
  }

  // ==================== SCORE MANAGEMENT ====================
  const updateScore = async (scoreId, newValue, newDate) => {
    const { error } = await supabase
      .from('scores')
      .update({ score_value: newValue, score_date: newDate })
      .eq('id', scoreId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Score updated!')
      setEditingScore(null)
      fetchAllData()
    }
  }

  const deleteScore = async (scoreId) => {
    if (confirm('Delete this score?')) {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('id', scoreId)
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Score deleted!')
        fetchAllData()
      }
    }
  }

  // ==================== CHARITY MANAGEMENT ====================
  const handleAddCharity = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('charities')
      .insert([newCharity])
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Charity added successfully!')
      setNewCharity({ name: '', description: '', image_url: '', featured: false })
      fetchAllData()
    }
  }

  const updateCharity = async (charity) => {
    const { error } = await supabase
      .from('charities')
      .update({
        name: charity.name,
        description: charity.description,
        image_url: charity.image_url,
        featured: charity.featured
      })
      .eq('id', charity.id)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Charity updated!')
      setEditingCharity(null)
      fetchAllData()
    }
  }

  const deleteCharity = async (id) => {
    if (confirm('Delete this charity? This will remove it from all users.')) {
      const { error } = await supabase
        .from('charities')
        .delete()
        .eq('id', id)
      
      if (error) {
        alert('Error: ' + error.message)
      } else {
        alert('Charity deleted!')
        fetchAllData()
      }
    }
  }

  // ==================== DRAW MANAGEMENT ====================
  const generateRandomNumbers = () => {
    const numbers = []
    for (let i = 0; i < 5; i++) {
      numbers.push(Math.floor(Math.random() * 45) + 1)
    }
    return numbers.sort((a, b) => a - b)
  }

  const generateAlgorithmicNumbers = async () => {
    const { data: allScores } = await supabase
      .from('scores')
      .select('score_value')
    
    if (!allScores || allScores.length === 0) {
      return generateRandomNumbers()
    }

    const frequency = {}
    allScores.forEach(score => {
      frequency[score.score_value] = (frequency[score.score_value] || 0) + 1
    })

    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1])
    const topNumbers = sorted.slice(0, 5).map(item => parseInt(item[0]))
    
    while (topNumbers.length < 5) {
      const random = Math.floor(Math.random() * 45) + 1
      if (!topNumbers.includes(random)) {
        topNumbers.push(random)
      }
    }
    
    return topNumbers.sort((a, b) => a - b)
  }

  const runSimulation = async () => {
    let numbers = []
    if (drawType === 'random') {
      numbers = generateRandomNumbers()
    } else {
      numbers = await generateAlgorithmicNumbers()
    }
    setDrawNumbers(numbers.map(n => n.toString()))
    
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name, subscription_status')
    
    const { data: allScores } = await supabase
      .from('scores')
      .select('user_id, score_value')
    
    const userScores = {}
    allScores?.forEach(score => {
      if (!userScores[score.user_id]) {
        userScores[score.user_id] = []
      }
      userScores[score.user_id].push(score.score_value)
    })
    
    const activeUsers = allUsers?.filter(u => u.subscription_status === 'active') || []
    const prizePerUser = 500
    const totalPrizePool = activeUsers.length * prizePerUser
    
    const simulatedWinners = []
    activeUsers?.forEach(user => {
      const userScoreList = userScores[user.id] || []
      const matches = userScoreList.filter(score => numbers.includes(score)).length
      if (matches >= 3) {
        let prize = 0
        if (matches === 5) prize = totalPrizePool * 0.4
        else if (matches === 4) prize = totalPrizePool * 0.35
        else if (matches === 3) prize = totalPrizePool * 0.25
        simulatedWinners.push({
          user_id: user.id,
          name: user.full_name,
          matches: matches,
          prize: Math.floor(prize)
        })
      }
    })
    
    setSimulationResult({
      numbers: numbers,
      winners: simulatedWinners,
      totalWinners: simulatedWinners.length,
      totalPrizePool: totalPrizePool
    })
  }

  const publishDraw = async () => {
    const numbers = drawNumbers.map(n => parseInt(n)).filter(n => !isNaN(n))
    if (numbers.length !== 5) {
      alert('Please enter 5 valid numbers (1-45)')
      return
    }

    const drawDateValue = drawDate || new Date().toISOString().split('T')[0]
    const { data: drawData, error: drawError } = await supabase
      .from('draws')
      .insert([{
        draw_date: drawDateValue,
        winning_numbers: numbers,
        draw_type: drawType,
        is_published: true
      }])
      .select()
      .single()

    if (drawError) {
      alert('Error: ' + drawError.message)
      return
    }

    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('subscription_status', 'active')

    const { data: allScores } = await supabase
      .from('scores')
      .select('user_id, score_value')

    const prizePerUser = 500
    const totalPrizePool = (activeUsers?.length || 0) * prizePerUser

    const userMatches = {}
    allScores?.forEach(score => {
      if (numbers.includes(score.score_value)) {
        userMatches[score.user_id] = (userMatches[score.user_id] || 0) + 1
      }
    })

    const winnersList = []
    for (const [userId, matches] of Object.entries(userMatches)) {
      if (matches >= 3) {
        let prize = 0
        if (matches === 5) prize = totalPrizePool * 0.4
        else if (matches === 4) prize = totalPrizePool * 0.35
        else if (matches === 3) prize = totalPrizePool * 0.25
        
        winnersList.push({
          user_id: userId,
          draw_id: drawData.id,
          match_count: matches,
          prize_amount: Math.floor(prize),
          payment_status: 'pending'
        })
      }
    }

    if (winnersList.length > 0) {
      const { error: winnersError } = await supabase
        .from('winners')
        .insert(winnersList)

      if (winnersError) {
        alert('Error saving winners: ' + winnersError.message)
      } else {
        alert(`Draw published! ${winnersList.length} winners found. Total prize pool: ₹${totalPrizePool}`)
      }
    } else {
      alert(`Draw published! No winners this time. Jackpot will rollover.`)
    }

    fetchAllData()
    setSimulationResult(null)
    setDrawNumbers(['', '', '', '', ''])
  }

  // ==================== WINNER MANAGEMENT ====================
  const verifyWinner = async (winnerId, status) => {
    const { error } = await supabase
      .from('winners')
      .update({ payment_status: status })
      .eq('id', winnerId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Winner ${status === 'paid' ? 'verified and paid!' : 'rejected!'}`)
      fetchAllData()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading Admin Panel...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Complete control over users, scores, charities, draws, and winners</p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8 overflow-x-auto">
        <nav className="flex gap-4">
          {['overview', 'users', 'scores', 'charities', 'draws', 'winners'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalUsers}</div>
            <div className="text-gray-600 text-sm">Total Users</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            <div className="text-gray-600 text-sm">Active Subscriptions</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalScores}</div>
            <div className="text-gray-600 text-sm">Total Scores</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-purple-600">₹{stats.totalPrizePool}</div>
            <div className="text-gray-600 text-sm">Prize Pool Distributed</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.totalDraws}</div>
            <div className="text-gray-600 text-sm">Total Draws</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-2xl font-bold text-pink-600">{charities.length}</div>
            <div className="text-gray-600 text-sm">Active Charities</div>
          </div>
        </div>
      )}

      {/* USERS TAB - Full Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charity %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selected Charity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.subscription_status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={user.charity_percentage || 10}
                        onChange={(e) => updateUserPercentage(user.id, parseInt(e.target.value))}
                        className="w-16 border rounded px-1 py-0.5 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.selected_charity_id || ''}
                        onChange={(e) => updateUserCharity(user.id, e.target.value)}
                        className="text-sm border rounded px-1 py-0.5"
                      >
                        <option value="">None</option>
                        {charities.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateUserSubscription(
                          user.id, 
                          user.subscription_status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`px-3 py-1 rounded text-sm ${
                          user.subscription_status === 'active'
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {user.subscription_status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCORES TAB - View/Edit/Delete All Scores */}
      {activeTab === 'scores' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scores.map((score) => (
                  <tr key={score.id}>
                    <td className="px-4 py-3">{score.profiles?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      {editingScore?.id === score.id ? (
                        <input
                          type="number"
                          min="1"
                          max="45"
                          defaultValue={score.score_value}
                          onBlur={(e) => updateScore(score.id, parseInt(e.target.value), score.score_date)}
                          className="w-20 border rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-indigo-600">{score.score_value}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(score.score_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingScore(score)}
                        className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteScore(score.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHARITIES TAB - Full CRUD */}
      {activeTab === 'charities' && (
        <div>
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Add New Charity</h2>
            <form onSubmit={handleAddCharity} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Charity Name"
                value={newCharity.name}
                onChange={(e) => setNewCharity({ ...newCharity, name: e.target.value })}
                className="border rounded-lg px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Image URL"
                value={newCharity.image_url}
                onChange={(e) => setNewCharity({ ...newCharity, image_url: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <textarea
                placeholder="Description"
                value={newCharity.description}
                onChange={(e) => setNewCharity({ ...newCharity, description: e.target.value })}
                className="border rounded-lg px-3 py-2 md:col-span-2"
                rows="3"
                required
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newCharity.featured}
                  onChange={(e) => setNewCharity({ ...newCharity, featured: e.target.checked })}
                />
                <span>Featured Charity</span>
              </label>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 md:col-span-2">
                Add Charity
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {charities.map((charity) => (
                    <tr key={charity.id}>
                      <td className="px-4 py-3 font-medium">
                        {editingCharity?.id === charity.id ? (
                          <input
                            value={editingCharity.name}
                            onChange={(e) => setEditingCharity({ ...editingCharity, name: e.target.value })}
                            className="border rounded px-2 py-1"
                          />
                        ) : (
                          charity.name
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {editingCharity?.id === charity.id ? (
                          <textarea
                            value={editingCharity.description}
                            onChange={(e) => setEditingCharity({ ...editingCharity, description: e.target.value })}
                            className="border rounded px-2 py-1"
                          />
                        ) : (
                          charity.description
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingCharity?.id === charity.id ? (
                          <input
                            type="checkbox"
                            checked={editingCharity.featured}
                            onChange={(e) => setEditingCharity({ ...editingCharity, featured: e.target.checked })}
                          />
                        ) : (
                          charity.featured ? '⭐ Yes' : 'No'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingCharity?.id === charity.id ? (
                          <>
                            <button onClick={() => updateCharity(editingCharity)} className="text-green-600 mr-2">Save</button>
                            <button onClick={() => setEditingCharity(null)} className="text-gray-500">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingCharity(charity)} className="text-blue-600 mr-2">Edit</button>
                            <button onClick={() => deleteCharity(charity.id)} className="text-red-600">Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DRAWS TAB */}
      {activeTab === 'draws' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Run New Draw</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Draw Type</label>
                <select
                  value={drawType}
                  onChange={(e) => setDrawType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="random">Random (Lottery Style)</option>
                  <option value="algorithmic">Algorithmic (Based on Player Scores)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Draw Date</label>
                <input
                  type="date"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Winning Numbers (1-45)</label>
              <div className="flex gap-2">
                {drawNumbers.map((num, idx) => (
                  <input
                    key={idx}
                    type="number"
                    min="1"
                    max="45"
                    value={num}
                    onChange={(e) => {
                      const newNumbers = [...drawNumbers]
                      newNumbers[idx] = e.target.value
                      setDrawNumbers(newNumbers)
                    }}
                    className="w-14 h-12 text-center border rounded-lg"
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={runSimulation}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Run Simulation
              </button>
              <button
                onClick={publishDraw}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Publish Draw
              </button>
            </div>
          </div>

          {simulationResult && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Simulation Results</h2>
              <div className="mb-4">
                <p className="font-medium">Winning Numbers:</p>
                <div className="flex gap-2 mt-2">
                  {simulationResult.numbers.map((num, i) => (
                    <span key={i} className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                      {num}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-600">Total Prize Pool: ₹{simulationResult.totalPrizePool}</p>
              </div>
              <div>
                <p className="font-medium mb-2">Potential Winners: ({simulationResult.totalWinners})</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {simulationResult.winners.slice(0, 10).map((winner, i) => (
                    <div key={i} className="flex justify-between items-center border-b py-2">
                      <span>{winner.name}</span>
                      <span className="text-orange-600">{winner.matches} matches</span>
                      <span className="text-green-600 font-bold">₹{winner.prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold p-6 pb-0">Previous Draws</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winning Numbers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.map((draw) => (
                    <tr key={draw.id}>
                      <td className="px-4 py-3">{new Date(draw.draw_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {draw.winning_numbers?.map((num, i) => (
                            <span key={i} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                              {num}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{draw.draw_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WINNERS TAB */}
      {activeTab === 'winners' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prize</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {winners.map((winner) => (
                  <tr key={winner.id}>
                    <td className="px-4 py-3">{winner.profiles?.full_name || 'Unknown'}</td>
                    <td className="px-4 py-3">{winner.match_count} matches</td>
                    <td className="px-4 py-3 font-bold text-green-600">₹{winner.prize_amount?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        winner.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {winner.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {winner.payment_status !== 'paid' && (
                        <button
                          onClick={() => verifyWinner(winner.id, 'paid')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Approve & Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}