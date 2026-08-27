import Avatar3D from '@/components/Avatar3D';
export default function Av3dTest() {
  return (
    <div className="max-w-sm mx-auto p-4">
      <Avatar3D measures={{ height: 178, weight: 80, gender: 'masculino' }} />
    </div>
  );
}
