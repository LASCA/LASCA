
const defaultClassName = 'bg-slate-950/80 border border-slate-800 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none transition-all w-full font-mono placeholder-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const InputField = ({ label, value, onChange, className = defaultClassName, ...inputProps }) => {
  const handleChange = (e) => {
    e.target.value = e.target.value.replace(/,/g, '.');
    onChange(e);
  };

  const input = (
    <input
      {...inputProps}
      value={value !== undefined ? value : ''}
      onChange={handleChange}
      className={className}
    />
  );

  if (label === undefined) return input;

  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[11px] text-slate-400 ml-1 font-semibold">{label}</label>
      {input}
    </div>
  );
};

export default InputField;
