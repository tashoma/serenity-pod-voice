import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../pages/Home';

// Mock the components we don't want to fully render
jest.mock('../components/WebcamComponent', () => {
  return function MockWebcamComponent({ onMoodUpdate }) {
    return (
      <div data-testid="mock-webcam">
        <button onClick={() => onMoodUpdate('happy')}>Simulate Happy Mood</button>
      </div>
    );
  };
});

jest.mock('../components/AvatarComponent', () => {
  return function MockAvatarComponent({ mood, speaking }) {
    return (
      <div data-testid="mock-avatar">
        Mood: {mood}, Speaking: {speaking.toString()}
      </div>
    );
  };
});

describe('Home Component', () => {
  test('renders without crashing', () => {
    render(<Home />);
    
    // Check that main elements are present
    expect(screen.getByText(/SerenityPod/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to speak/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  test('updates mood when detected from webcam', () => {
    render(<Home />);
    
    // Simulate mood update from webcam
    userEvent.click(screen.getByText('Simulate Happy Mood'));
    
    // Check that the mood is updated in the avatar
    expect(screen.getByTestId('mock-avatar')).toHaveTextContent('Mood: happy');
  });
  
  test('changes button state when recording starts', () => {
    render(<Home />);
    
    // Get initial button
    const micButton = screen.getByRole('button');
    
    // Click the button to start recording
    userEvent.click(micButton);
    
    // Check that the recording status is updated
    expect(screen.getByText(/Recording.../i)).toBeInTheDocument();
  });
}); 