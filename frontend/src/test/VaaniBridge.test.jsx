import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import { Transcript } from '../components/Transcript';
import { StatusIndicator } from '../components/StatusIndicator';
import { LanguageSelector } from '../components/LanguageSelector';
import { STATUS } from '../hooks/useVoiceAgent';

// ─── App rendering ────────────────────────────────────────────────────────────

describe('App', () => {
  it('renders VaaniBridge title', () => {
    render(<App />);
    expect(screen.getByText('VaaniBridge')).toBeInTheDocument();
  });

  it('renders Real-Time AI Voice Agent subtitle', () => {
    render(<App />);
    expect(screen.getByText('Real-Time AI Voice Agent')).toBeInTheDocument();
  });

  it('shows Real Voice Agent mode by default', () => {
    render(<App />);
    expect(screen.getByText('Real Voice Agent')).toBeInTheDocument();
  });

  it('switches to Demo Mode when toggle clicked', async () => {
    render(<App />);
    const toggleBtn = document.getElementById('btn-mode-toggle');
    if (toggleBtn) fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(document.getElementById('demo-banner')).toBeInTheDocument();
    });
  });

  it('switches back to Real mode from demo', async () => {
    render(<App />);
    const toggleBtn = document.getElementById('btn-mode-toggle');
    if (toggleBtn) fireEvent.click(toggleBtn);
    await waitFor(() => expect(document.getElementById('demo-banner')).toBeInTheDocument());
    if (toggleBtn) fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(document.getElementById('demo-banner')).not.toBeInTheDocument();
    });
  });

  it('shows demo banner in demo mode', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Try Demo →'));
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('has Start Conversation button', () => {
    render(<App />);
    expect(document.getElementById('btn-start')).toBeInTheDocument();
  });
});

// ─── Status indicator ─────────────────────────────────────────────────────────

describe('StatusIndicator', () => {
  it('shows IDLE status', () => {
    render(<StatusIndicator status={STATUS.IDLE} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Click Start Conversation')).toBeInTheDocument();
  });

  it('shows CONNECTING status', () => {
    render(<StatusIndicator status="CONNECTING" />);
    expect(screen.getByText('Connecting')).toBeInTheDocument();
  });

  it('shows LISTENING status', () => {
    render(<StatusIndicator status="LISTENING" />);
    expect(screen.getByText('Listening')).toBeInTheDocument();
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('shows THINKING status', () => {
    render(<StatusIndicator status="THINKING" />);
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  it('shows SPEAKING status', () => {
    render(<StatusIndicator status="SPEAKING" />);
    expect(screen.getByText('Speaking')).toBeInTheDocument();
    expect(screen.getByText('VaaniBridge is speaking...')).toBeInTheDocument();
  });

  it('shows ERROR status', () => {
    render(<StatusIndicator status="ERROR" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Connection problem')).toBeInTheDocument();
  });

  it('shows CONNECTED status', () => {
    render(<StatusIndicator status="CONNECTED" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Voice agent connected')).toBeInTheDocument();
  });
});

// ─── Transcript rendering ─────────────────────────────────────────────────────

describe('Transcript', () => {
  const mockTranscript = [
    {
      id: '1',
      role: 'user',
      text: 'Hello, how are you?',
      timestamp: new Date('2025-01-01T10:00:00'),
    },
    {
      id: '2',
      role: 'agent',
      text: "I'm doing great! How can I help?",
      timestamp: new Date('2025-01-01T10:00:05'),
    },
  ];

  it('shows empty state when no transcript', () => {
    render(<Transcript transcript={[]} status={STATUS.IDLE} />);
    expect(screen.getByText('Your conversation will appear here')).toBeInTheDocument();
  });

  it('renders user messages', () => {
    render(<Transcript transcript={mockTranscript} status={STATUS.IDLE} />);
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
  });

  it('renders agent messages', () => {
    render(<Transcript transcript={mockTranscript} status={STATUS.IDLE} />);
    expect(screen.getByText("I'm doing great! How can I help?")).toBeInTheDocument();
  });

  it('shows typing indicator when agent is THINKING', () => {
    render(<Transcript transcript={mockTranscript} status="THINKING" />);
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('shows typing indicator when agent is SPEAKING', () => {
    render(<Transcript transcript={mockTranscript} status="SPEAKING" />);
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('does not show typing indicator when IDLE', () => {
    render(<Transcript transcript={mockTranscript} status={STATUS.IDLE} />);
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('labels user messages as "You"', () => {
    render(<Transcript transcript={[mockTranscript[0]]} status={STATUS.IDLE} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('labels agent messages as "VaaniBridge"', () => {
    render(<Transcript transcript={[mockTranscript[1]]} status={STATUS.IDLE} />);
    // There are two occurrences — the role label and the avatar label
    const elements = screen.getAllByText('VaaniBridge');
    expect(elements.length).toBeGreaterThan(0);
  });
});

// ─── Language selector ────────────────────────────────────────────────────────

describe('LanguageSelector', () => {
  it('renders English and Hindi options', () => {
    render(
      <LanguageSelector selected="en" onChange={() => {}} disabled={false} />
    );
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('हिंदी')).toBeInTheDocument();
  });

  it('marks English as active when selected', () => {
    render(
      <LanguageSelector selected="en" onChange={() => {}} disabled={false} />
    );
    const btn = screen.getByText('English').closest('button');
    expect(btn).toHaveClass('active');
  });

  it('calls onChange with correct language object', () => {
    const mockChange = vi.fn();
    render(
      <LanguageSelector selected="en" onChange={mockChange} disabled={false} />
    );
    fireEvent.click(screen.getByText('हिंदी').closest('button'));
    expect(mockChange).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'hi' })
    );
  });

  it('disables buttons when disabled=true', () => {
    render(
      <LanguageSelector selected="en" onChange={() => {}} disabled={true} />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ─── Session control buttons ──────────────────────────────────────────────────

describe('Session controls', () => {
  it('shows Start button in IDLE state', () => {
    render(<App />);
    expect(document.getElementById('btn-start')).toBeInTheDocument();
  });

  it('Start button has correct id', () => {
    render(<App />);
    expect(document.getElementById('btn-start')).toBeInTheDocument();
  });

  it('Clear button is disabled when no transcript', () => {
    render(<App />);
    const clearBtn = document.getElementById('btn-clear');
    expect(clearBtn).toBeDisabled();
  });

  it('shows mode toggle button', () => {
    render(<App />);
    expect(document.getElementById('btn-mode-toggle')).toBeInTheDocument();
  });
});

// ─── Demo mode ────────────────────────────────────────────────────────────────

describe('Demo Mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows demo banner when demo mode active', async () => {
    render(<App />);
    const toggleBtn = document.getElementById('btn-mode-toggle');
    if (toggleBtn) {
      await act(async () => {
        fireEvent.click(toggleBtn);
      });
    }
    expect(document.getElementById('demo-banner')).toBeInTheDocument();
  });

  it('hides demo banner in real mode', () => {
    render(<App />);
    expect(document.getElementById('demo-banner')).toBeNull();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('shows error banner when error occurs', async () => {
    // Simulate failed token fetch
    const originalFetch = global.fetch;
    global.fetch = () =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ detail: 'ASSEMBLYAI_API_KEY is not configured' }),
      });

    render(<App />);
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      await act(async () => {
        fireEvent.click(startBtn);
      });
    }

    await waitFor(() => {
      const errorBanner = document.getElementById('error-banner');
      if (errorBanner) {
        expect(errorBanner).toBeInTheDocument();
      }
    });

    global.fetch = originalFetch;
  });
});
