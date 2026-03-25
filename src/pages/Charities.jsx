import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Charities() {
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCharity, setSelectedCharity] = useState(null)
  const [user, setUser] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCharity, setNewCharity] = useState({
    name: '',
    description: '',
    image_url: '',
    featured: false
  })

  useEffect(() => {
    fetchCharities()
    getUser()
  }, [])

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchCharities = async () => {
    const { data, error } = await supabase
      .from('charities')
      .select('*')
      .order('featured', { ascending: false })

    if (!error && data) {
      setCharities(data)
    }
    setLoading(false)
  }

  const handleSelectCharity = async (charityId) => {
    if (!user) {
      alert('Please login first to select a charity')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ selected_charity_id: charityId })
      .eq('id', user.id)

    if (error) {
      alert('Error selecting charity: ' + error.message)
    } else {
      setSelectedCharity(charityId)
      alert('Charity selected successfully!')
    }
  }

  const handleAddCharity = async (e) => {
    e.preventDefault()
    
    const { error } = await supabase
      .from('charities')
      .insert([newCharity])

    if (error) {
      alert('Error adding charity: ' + error.message)
    } else {
      alert('Charity added successfully!')
      setNewCharity({ name: '', description: '', image_url: '', featured: false })
      setShowAddForm(false)
      fetchCharities()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Charities We Support</h1>
        <p className="text-xl text-gray-600">
          Your subscription helps these amazing organizations
        </p>
      </div>

      {/* Add Charity Button - Only visible to admin */}
      {user?.email === 'admin@digitalheroes.com' && (
        <div className="mb-8 text-right">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            {showAddForm ? 'Cancel' : '+ Add New Charity'}
          </button>
        </div>
      )}

      {/* Add Charity Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add New Charity</h2>
          <form onSubmit={handleAddCharity}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <button
              type="submit"
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Add Charity
            </button>
          </form>
        </div>
      )}

      {/* Charities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {charities.map((charity) => (
          <div
            key={charity.id}
            className={`bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer ${
              selectedCharity === charity.id ? 'ring-2 ring-indigo-500' : ''
            }`}
            onClick={() => handleSelectCharity(charity.id)}
          >
            {charity.image_url && (
              <img
                src={charity.image_url}
                alt={charity.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400x200?text=Charity';
                }}
              />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-gray-900">{charity.name}</h3>
                {charity.featured && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-4">{charity.description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectCharity(charity.id);
                }}
                className={`w-full py-2 rounded-lg transition ${
                  selectedCharity === charity.id
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {selectedCharity === charity.id ? 'Selected ✓' : 'Select This Charity'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Message if no charities */}
      {charities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No charities added yet.</p>
          {user?.email === 'admin@digitalheroes.com' && (
            <p className="text-gray-500 mt-2">Click "Add New Charity" to get started.</p>
          )}
        </div>
      )}
    </div>
  )
}