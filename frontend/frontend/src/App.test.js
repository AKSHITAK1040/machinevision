import { render, screen } from '@testing-library/react';
import App from './App';
test('renders the shoppable hero headline', () => {
  render(<App />);
  const headline = screen.getByText(/Turn Any Video Into a Shoppable Experience/i);
  expect(headline).toBeInTheDocument();
});

