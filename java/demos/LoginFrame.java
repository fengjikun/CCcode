import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;
import java.awt.event.*;

public class LoginFrame extends JFrame {

    private JTextField usernameField;
    private JPasswordField passwordField;

    // 模拟用户数据
    private static final String VALID_USER = "admin";
    private static final String VALID_PASS = "123456";

    public LoginFrame() {
        setTitle("系统登录");
        setSize(420, 300);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        setResizable(false);

        initUI();
    }

    private void initUI() {
        // 主面板
        JPanel mainPanel = new JPanel(new BorderLayout());
        mainPanel.setBackground(new Color(245, 247, 250));

        // 顶部标题栏
        JPanel headerPanel = new JPanel();
        headerPanel.setBackground(new Color(52, 120, 246));
        headerPanel.setPreferredSize(new Dimension(420, 70));
        JLabel titleLabel = new JLabel("系统登录");
        titleLabel.setFont(new Font("微软雅黑", Font.BOLD, 22));
        titleLabel.setForeground(Color.WHITE);
        headerPanel.add(titleLabel);

        // 表单面板
        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBackground(new Color(245, 247, 250));
        formPanel.setBorder(new EmptyBorder(20, 40, 20, 40));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(8, 8, 8, 8);
        gbc.fill = GridBagConstraints.HORIZONTAL;

        // 用户名行
        gbc.gridx = 0; gbc.gridy = 0; gbc.weightx = 0;
        JLabel userLabel = new JLabel("用户名：");
        userLabel.setFont(new Font("微软雅黑", Font.PLAIN, 14));
        formPanel.add(userLabel, gbc);

        gbc.gridx = 1; gbc.weightx = 1;
        usernameField = new JTextField(16);
        usernameField.setFont(new Font("微软雅黑", Font.PLAIN, 14));
        usernameField.setPreferredSize(new Dimension(200, 32));
        formPanel.add(usernameField, gbc);

        // 密码行
        gbc.gridx = 0; gbc.gridy = 1; gbc.weightx = 0;
        JLabel passLabel = new JLabel("密　码：");
        passLabel.setFont(new Font("微软雅黑", Font.PLAIN, 14));
        formPanel.add(passLabel, gbc);

        gbc.gridx = 1; gbc.weightx = 1;
        passwordField = new JPasswordField(16);
        passwordField.setFont(new Font("微软雅黑", Font.PLAIN, 14));
        passwordField.setPreferredSize(new Dimension(200, 32));
        formPanel.add(passwordField, gbc);

        // 按钮行
        gbc.gridx = 0; gbc.gridy = 2; gbc.gridwidth = 2;
        gbc.fill = GridBagConstraints.NONE;
        gbc.anchor = GridBagConstraints.CENTER;
        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 20, 0));
        btnPanel.setBackground(new Color(245, 247, 250));

        JButton loginBtn = createButton("登 录", new Color(52, 120, 246), Color.WHITE);
        JButton clearBtn = createButton("清 空", new Color(180, 180, 180), Color.WHITE);

        loginBtn.addActionListener(e -> handleLogin());
        clearBtn.addActionListener(e -> {
            usernameField.setText("");
            passwordField.setText("");
            usernameField.requestFocus();
        });

        // 回车触发登录
        getRootPane().setDefaultButton(loginBtn);

        btnPanel.add(loginBtn);
        btnPanel.add(clearBtn);
        formPanel.add(btnPanel, gbc);

        mainPanel.add(headerPanel, BorderLayout.NORTH);
        mainPanel.add(formPanel, BorderLayout.CENTER);
        add(mainPanel);
    }

    private JButton createButton(String text, Color bg, Color fg) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("微软雅黑", Font.BOLD, 14));
        btn.setBackground(bg);
        btn.setForeground(fg);
        btn.setFocusPainted(false);
        btn.setBorderPainted(false);
        btn.setPreferredSize(new Dimension(100, 36));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private void handleLogin() {
        String username = usernameField.getText().trim();
        String password = new String(passwordField.getPassword());

        if (username.isEmpty() || password.isEmpty()) {
            JOptionPane.showMessageDialog(this, "用户名和密码不能为空！", "提示", JOptionPane.WARNING_MESSAGE);
            return;
        }

        if (VALID_USER.equals(username) && VALID_PASS.equals(password)) {
            JOptionPane.showMessageDialog(this, "登录成功，欢迎您：" + username, "成功", JOptionPane.INFORMATION_MESSAGE);
            // TODO: 跳转到主界面
            dispose();
        } else {
            JOptionPane.showMessageDialog(this, "用户名或密码错误，请重试！", "错误", JOptionPane.ERROR_MESSAGE);
            passwordField.setText("");
            passwordField.requestFocus();
        }
    }

    public static void main(String[] args) {
        // 使用系统外观
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        SwingUtilities.invokeLater(() -> new LoginFrame().setVisible(true));
    }
}