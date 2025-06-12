import React, { useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronUpIcon, ChatBubbleLeftIcon, PencilIcon, CodeBracketIcon } from '@heroicons/react/24/outline'

// Inline styles to ensure the component works even if Tailwind doesn't load
const styles = {
  menuButton: {
    width: '160px',
    height: '44px',
    borderRadius: '22px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto' as const
  },
  menuItems: {
    position: 'absolute' as const,
    bottom: '52px',
    right: '0',
    width: '200px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    padding: '8px 0',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    pointerEvents: 'auto' as const
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    fontWeight: '500'
  },
  menuItemHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  icon: {
    width: '20px',
    height: '20px',
    marginRight: '12px',
    color: 'rgba(255, 255, 255, 0.7)'
  }
}

const FloatingIcon: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)

  const menuItems = [
    { name: 'GitHub', icon: CodeBracketIcon, action: () => handleGitHub() },
    { name: 'Comment', icon: ChatBubbleLeftIcon, action: () => handleComment() },
    { name: 'Edit', icon: PencilIcon, action: () => handleEdit() },
  ]

  const handleGitHub = () => {
    console.log('Github feature activated!')
    setIsExpanded(false)
  }

  const handleComment = () => {
    console.log('Comment feature activated!')
    setIsExpanded(false)
  }

  const handleEdit = () => {
    console.log('Edit feature activated!')
    setIsExpanded(false)
  }

  return (
    <div className="relative">
        <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button
            style={{
              ...styles.menuButton,
              backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.7)'
            }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <CodeBracketIcon 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2
              }} 
            />
            <ChatBubbleLeftIcon 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2
              }} 
            />
            <PencilIcon 
              style={{ 
                width: '18px', 
                height: '18px', 
                color: 'white',
                opacity: 0.9,
                strokeWidth: 2
              }} 
            />
            <ChevronUpIcon 
              style={{
                width: '14px',
                height: '14px',
                color: 'white',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                opacity: 0.6,
                strokeWidth: 2
              }}
            />
          </Menu.Button>
        </div>

        <Transition
          show={isExpanded}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items style={styles.menuItems}>
            {menuItems.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <button
                    onClick={item.action}
                    style={{
                      ...styles.menuItem,
                      backgroundColor: active ? '#f9fafb' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <item.icon
                      style={styles.icon}
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  )
}

export default FloatingIcon 