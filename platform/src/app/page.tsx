import MarketingLayout from './(marketing)/layout';
import HomePage from './(marketing)/page';

// Root page composes the marketing layout + landing page.
// This ensures "/" gets the public header/footer chrome.
export default function RootPage() {
  return (
    <MarketingLayout>
      <HomePage />
    </MarketingLayout>
  );
}
