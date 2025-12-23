import { Link, useLocation } from 'react-router-dom'

export default function FemaleTabs() {
  const loc = useLocation()
  const is = (p: string) => loc.pathname.startsWith(p)

  return (
    <div className="tab-btn-row">
      {/* Rounds */}
      <Link
        className={`tab-btn${is('/dashboard/round') ? ' tab-btn-active' : ''}`}
        to="/dashboard/round"
      >
        <span className="tab-btn-icon">
          {/* Calendar/rounds icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Rounds">
            <title>Rounds</title>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M9 16l2 2 4-4" />
          </svg>
        </span>
        <span className="tab-btn-label">Rounds</span>
      </Link>

      {/* Matches */}
      <Link
        className={`tab-btn${is('/dashboard/matches') ? ' tab-btn-active' : ''}`}
        to="/dashboard/matches"
      >
        <span className="tab-btn-icon">
          {/* Double-heart like MaleTabs */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF1493" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Matches">
            <title>Matches</title>
            <g transform="translate(-1.6 0)" strokeOpacity="0.45">
              <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z" />
            </g>
            <g transform="translate(1.6 0)">
              <path d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.682 4.318 12.682a4.5 4.5 0 010-6.364z" />
            </g>
          </svg>
        </span>
        <span className="tab-btn-label">Matches</span>
      </Link>

      {/* Chat */}
      <Link
        className={`tab-btn${is('/dashboard/chat') ? ' tab-btn-active' : ''}`}
        to="/dashboard/chat"
      >
        <span className="tab-btn-icon">
          {/* Chat bubble */}
          {/* Chat bubble (message-circle) */}
          {/* <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7DD3FC" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Chat">
            <title>Chat</title>
            <path d="M21 11.5a8.5 8.5 0 1 1-3.1-6.6L21 4l-.9 3.2a8.55 8.55 0 0 1 .1 4.3z"/>
            <circle cx="8.5" cy="11.5" r="0.8"/>
            <circle cx="12" cy="11.5" r="0.8"/>
            <circle cx="15.5" cy="11.5" r="0.8"/>
          </svg> */}

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" role="img" aria-labelledby="chatOutlineTitle">
            <title id="chatOutlineTitle">Chat</title>
            <path fill="none" stroke="#7DD3FC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              d="M21 15a2 2 0 0 1-2 2H8l-4 3V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span className="tab-btn-label">Chat</span>
      </Link>

      {/* Profile */}
      <Link
        className={`tab-btn${is('/dashboard/female/profile') ? ' tab-btn-active' : ''}`}
        to="/dashboard/female/profile"
      >
        <span className="tab-btn-icon">
          {/* User profile */}
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6CA0DC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Profile">
            <title>User Profile</title>
            <circle cx="12" cy="7" r="4" />
            <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
            <path d="M4 19c4-3 12-3 16 0" strokeOpacity="0.3" />
          </svg>
        </span>
        <span className="tab-btn-label">Profile</span>
      </Link>
    </div>
  )
}