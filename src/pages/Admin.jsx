import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [charities, setCharities] = useState([])
  const [draws, setDraws] = useState([])
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalScores: 0,
    totalDonated: 0
  })

  // Form states
  const [newCharity, setNewCharity] = useState({
    name: '',
    description: '',
    image_url: '',
    featured: false
  })
  const [editingCharity, setEditingCharity] = useState(null)
  const [drawNumbers, setDrawNumbers] = useState(['', '', '', '', ''])
  const [drawType, setDrawType] = useState('random')
  const [drawDate, setDrawDate] = useState('')
  const [simulationResult, setSimulationResult] = useState(null)

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

    // Fetch winners
    const { data: winnersData } = await supabase
      .from('winners')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    setWinners(winnersData || [])

    // Calculate stats
    const { data: scoresData } = await supabase
      .from('scores')
      .select('*')
    
    const activeUsers = usersData?.filter(u => u.subscription_status === 'active').length || 0
    
    setStats({
      totalUsers: usersData?.length || 0,
      activeSubscriptions: activeUsers,
      totalScores: scoresData?.length || 0,
      totalDonated: 0 // Will calculate from subscriptions
    })

    setLoading(false)
  }

  // Charity Functions
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

  const handleUpdateCharity = async (charity) => {
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

  const handleDeleteCharity = async (id) => {
    if (confirm('Are you sure you want to delete this charity?')) {
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

  // Draw Functions
  const generateRandomNumbers = () => {
    const numbers = []
    for (let i = 0; i < 5; i++) {
      numbers.push(Math.floor(Math.random() * 45) + 1)
    }
    return numbers.sort((a, b) => a - b)
  }

  const generateAlgorithmicNumbers = async () => {
    // Get all user scores to find most common numbers
    const { data: allScores } = await supabase
      .from('scores')
      .select('score_value')
    
    if (!allScores || allScores.length === 0) {
      return generateRandomNumbers()
    }

    // Count frequency of each score
    const frequency = {}
    allScores.forEach(score => {
      frequency[score.score_value] = (frequency[score.score_value] || 0) + 1
    })

    // Get most frequent scores
    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1])
    const topNumbers = sorted.slice(0, 5).map(item => parseInt(item[0]))
    
    // If less than 5, fill with random
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
    
    // Get all users with scores
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name')
    
    const { data: allScores } = await supabase
      .from('scores')
      .select('user_id, score_value')
    
    // Calculate winners
    const userScores = {}
    allScores?.forEach(score => {
      if (!userScores[score.user_id]) {
        userScores[score.user_id] = []
      }
      userScores[score.user_id].push(score.score_value)
    })
    
    const simulatedWinners = []
    allUsers?.forEach(user => {
      const userScoreList = userScores[user.id] || []
      const matches = userScoreList.filter(score => numbers.includes(score)).length
      if (matches >= 3) {
        simulatedWinners.push({
          user_id: user.id,
          name: user.full_name,
          matches: matches,
          prize: calculatePrize(matches, 10000) // Assuming ₹10,000 prize pool
        })
      }
    })
    
    setSimulationResult({
      numbers: numbers,
      winners: simulatedWinners,
      totalWinners: simulatedWinners.length
    })
  }

  const calculatePrize = (matches, totalPool) => {
    if (matches === 5) return totalPool * 0.4
    if (matches === 4) return totalPool * 0.35
    if (matches === 3) return totalPool * 0.25
    return 0
  }

  const publishDraw = async () => {
    const numbers = drawNumbers.map(n => parseInt(n)).filter(n => !isNaN(n))
    if (numbers.length !== 5) {
      alert('Please enter 5 valid numbers (1-45)')
      return
    }
    
    const { error } = await supabase
      .from('draws')
      .insert([{
        draw_date: drawDate || new Date().toISOString().split('T')[0],
        winning_numbers: numbers,
        draw_type: drawType,
        is_published: true
      }])
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('Draw published successfully!')
      fetchAllData()
      setSimulationResult(null)
      setDrawNumbers(['', '', '', '', ''])
    }
  }

  // User Functions
  const updateUserSubscription = async (userId, status) => {
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: status })
      .eq('id', userId)
    
    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('User subscription updated!')
      fetchAllData()
    }
  }

  // Winner Functions
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
      <p className="text-gray-600 mb-8">Manage users, charities, draws, and winners</p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex flex-wrap gap-4">
          {['overview', 'users', 'charities', 'draws', 'winners'].map((tab) => (
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-indigo-600">{stats.totalUsers}</div>
            <div className="text-gray-600 mt-1">Total Users</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</div>
            <div className="text-gray-600 mt-1">Active Subscriptions</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-blue-600">{stats.totalScores}</div>
            <div className="text-gray-600 mt-1">Total Scores</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl font-bold text-purple-600">{charities.length}</div>
            <div className="text-gray-600 mt-1">Active Charities</div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Charity %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">{user.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.id?.slice(0, 8)}...</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.subscription_status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.subscription_status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{user.charity_percentage}%</td>
                    <td className="px-6 py-4">
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

      {/* Charities Tab */}
      {activeTab === 'charities' && (
        <div>
          {/* Add Charity Form */}
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

          {/* Charities List */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {charities.map((charity) => (
                    <tr key={charity.id}>
                      <td className="px-6 py-4 font-medium">{charity.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{charity.description}</td>
                      <td className="px-6 py-4">{charity.featured ? '⭐ Yes' : 'No'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteCharity(charity.id)}
                          className="text-red-600 hover:text-red-800"
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
        </div>
      )}

      {/* Draws Tab */}
      {activeTab === 'draws' && (
        <div className="space-y-6">
          {/* Run Draw Section */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Run New Draw</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="mt-4 flex gap-4">
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

          {/* Simulation Results */}
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
              </div>
              <div>
                <p className="font-medium mb-2">Potential Winners: ({simulationResult.totalWinners})</p>
                <div className="space-y-2">
                  {simulationResult.winners.slice(0, 5).map((winner, i) => (
                    <div key={i} className="flex justify-between items-center border-b py-2">
                      <span>{winner.name}</span>
                      <span className="text-green-600 font-medium">{winner.matches} matches</span>
                    </div>
                  ))}
                  {simulationResult.totalWinners > 5 && (
                    <p className="text-gray-500 text-sm">+{simulationResult.totalWinners - 5} more winners</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Previous Draws */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold p-6 pb-0">Previous Draws</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winning Numbers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {draws.map((draw) => (
                    <tr key={draw.id}>
                      <td className="px-6 py-4">{new Date(draw.draw_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {draw.winning_numbers?.map((num, i) => (
                            <span key={i} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                              {num}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">{draw.draw_type}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Published
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Winners Tab */}
      {activeTab === 'winners' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matches</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prize Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {winners.map((winner) => (
                  <tr key={winner.id}>
                    <td className="px-6 py-4">{winner.profiles?.full_name || 'Unknown'}</td>
                    <td className="px-6 py-4">{winner.match_count} matches</td>
                    <td className="px-6 py-4">₹{winner.prize_amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        winner.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {winner.payment_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
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