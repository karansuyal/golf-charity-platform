import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white">
              Golf for a{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                Cause
              </span>
            </h1>
            <p className="mt-6 text-xl text-indigo-100 max-w-3xl mx-auto">
              Play golf, win amazing prizes, and support charities you love. 
              Every subscription makes a real difference.
            </p>
            <div className="mt-10 flex gap-4 justify-center">
              <Link
                to="/signup"
                className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition duration-200 shadow-lg"
              >
                Get Started
              </Link>
              <Link
                to="/charities"
                className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-indigo-600 transition duration-200"
              >
                View Charities
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900">How It Works</h2>
            <p className="mt-4 text-xl text-gray-600">Three simple steps to start making an impact</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: "01", title: "Subscribe", desc: "Choose monthly or yearly subscription plan" },
              { num: "02", title: "Enter Scores", desc: "Submit your golf scores in Stableford format" },
              { num: "03", title: "Win & Donate", desc: "Win prizes and support your favorite charity" }
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-6">
                  <span className="text-2xl font-bold text-indigo-600">{feature.num}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-700">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to make a difference?
          </h2>
          <p className="mt-4 text-xl text-indigo-200">
            Join thousands of golfers who are changing lives
          </p>
          <div className="mt-8">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition duration-200 shadow-lg"
            >
              Start Your Journey
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}