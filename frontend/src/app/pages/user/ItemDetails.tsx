import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ArrowLeft, Calendar, Package, ShoppingCart, Laptop } from 'lucide-react';
import { Input } from '../../components/Input';
import { SuccessToast } from '../../components/SuccessToast';

export default function ItemDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Mock item data
  const item = {
    id: 1,
    name: 'MacBook Pro 16"',
    category: 'Computers',
    status: 'available',
    condition: 'Excellent',
    image: 'laptop',
    description: 'High-performance laptop for development, design, and media production. Equipped with the latest M3 Max chip for exceptional performance.',
    specs: {
      processor: 'Apple M3 Max',
      memory: '32GB Unified RAM',
      storage: '1TB SSD',
      display: '16.2" Liquid Retina XDR',
      graphics: '30-core GPU',
      battery: 'Up to 18 hours',
    },
    serialNumber: 'MPB-2024-001',
    purchaseDate: '2024-01-15',
    location: 'Engineering Building - Room 301',
  };
  
  const similarItems = [
    { id: 2, name: 'MacBook Pro 14"', status: 'available' },
    { id: 3, name: 'Dell XPS 15', status: 'borrowed' },
    { id: 4, name: 'ThinkPad X1 Carbon', status: 'available' },
  ];
  
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRequestForm(false);
    setShowSuccessToast(true);
    setTimeout(() => {
      navigate('/user/requests');
    }, 2200);
  };
  
  return (
    <div className="space-y-6">
      {/* Success Toast */}
      <SuccessToast
        isOpen={showSuccessToast}
        message="Request submitted successfully!"
        duration={2000}
        onClose={() => setShowSuccessToast(false)}
      />
      
      {/* Back Button */}
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/user/catalog')}>
        Back to Catalog
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Header */}
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>{item.name}</h1>
                <div className="flex items-center gap-3">
                  <Badge variant="info" size="sm">{item.category}</Badge>
                  <Badge
                    variant={item.status === 'available' ? 'success' : 'warning'}
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F9FCFE] to-[#F9FAFD] dark:from-[#2D3748] dark:to-[#374151] flex items-center justify-center border border-border">
                <Laptop className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            <p className="text-foreground leading-relaxed mb-6">{item.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(item.specs).map(([key, value]) => (
                <div key={key} className="p-3 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{value}</p>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Additional Info */}
          <Card>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Additional Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Serial Number</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{item.serialNumber}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Purchase Date</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{item.purchaseDate}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Condition</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{item.condition}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Location</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{item.location}</span>
              </div>
            </div>
          </Card>
          
          {/* Similar Items */}
          <Card>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Similar Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarItems.map((similar) => (
                <button
                  key={similar.id}
                  onClick={() => navigate(`/user/catalog/${similar.id}`)}
                  className="p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{similar.name}</p>
                  </div>
                  <Badge
                    variant={similar.status === 'available' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {similar.status}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </div>
        
        {/* Sidebar - Request Form */}
        <div>
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <Calendar className="w-5 h-5" />
              Request to Borrow
            </h3>
            
            {!showRequestForm ? (
              <div className="space-y-4">
                <div className="p-4 bg-sidebar-accent rounded-xl border border-border">
                  <p className="text-sm text-foreground mb-2">
                    This item is currently available and ready to be borrowed.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fill in your borrowing dates to submit a request.
                  </p>
                </div>
                <Button
                  fullWidth
                  icon={ShoppingCart}
                  onClick={() => setShowRequestForm(true)}
                  disabled={item.status !== 'available'}
                >
                  Request Borrow
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} noValidate className="space-y-4">
                <Input
                  type="date"
                  label="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="date"
                  label="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
                <div className="p-3 bg-sidebar-accent rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground">
                    Your request will be reviewed by the college admin. You'll receive a notification once it's approved.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button type="submit" fullWidth>
                    Submit Request
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    fullWidth
                    onClick={() => setShowRequestForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}