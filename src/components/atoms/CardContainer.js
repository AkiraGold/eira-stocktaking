export default function CardContainer({ children, className = "", style = {} }) {
    return (
        <div className={`rounded-2xl bg-[var(--surface-2)] p-4 flex flex-col ${className}`} style={style}>
            {children}
        </div>
    );
}